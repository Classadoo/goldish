const DataHandlers = require("./DataHandlers")
const incrementGlobalTriggerCount = require("./incrementGlobalTriggerCount")
const InMemoryStorage = require("../in_memory_store/InMemoryStorage")
const FlattenedObjectStore = require("../in_memory_store/FlattenedObjectStore")
const InMemoryRefFactory = require("../in_memory_store/InMemoryRefFactory")
const RefBuilders = require("./RefBuilders")
const Util = require("../../common/Util.js")
const parseAddedAndRemovedChildren = require("../../common/parseAddedAndRemovedChildren")
const MultiListener = require("./BaseMultiListener")

function Hydrator(listDataHandler, hydratorDataHandler, _opts) {
  const opts = _opts || {}
  // mapping function for each element
  const mapFunction = opts.mapFunction
  // mapping function for the entire value
  let valueMapFunction = opts.valueMapFunction
  const returnedName = listDataHandler.name
  const offFunctions = []

  function buildProxyStore() {
    const mStore = {}
    const storage = new InMemoryStorage(mStore)
    const inMemoryStore = new FlattenedObjectStore(storage, {})
    const inMemoryRefFactory = new InMemoryRefFactory(inMemoryStore)
    const handlerNames = {}

    handlerNames[returnedName] = "store"
    handlerNames.item = "store/<id>"

    const baseRefBuilder = _ =>
      Promise.resolve(inMemoryRefFactory.build("").child(_))

    const handlers = new DataHandlers(
      baseRefBuilder,
      {},
      `hydrators${Util.guid()}`
    )
    const allRefBuilders = RefBuilders(baseRefBuilder, handlerNames)
    handlers.buildFromRefBuilderMap(allRefBuilders)

    return { handler: handlers[returnedName], store: inMemoryStore }
  }

  function once(callback) {
    return listDataHandler.once().then(relationshipDataMap => {
      const ids = Object.keys(relationshipDataMap || {})

      const hydrated = {}
      Object.defineProperty(hydrated, "_index", { value: relationshipDataMap })
      const hydratedPromises = ids.map(id => {
        const value = relationshipDataMap[id]
        const queryKey = id

        return hydratorDataHandler(queryKey)
          .once()
          .then(data => {
            if (mapFunction) {
              data = mapFunction(data)
            }
            hydrated[id] = data
          })
      })

      return Promise.all(hydratedPromises).then(() => {
        const mappedValue = valueMapFunction
          ? valueMapFunction(hydrated)
          : hydrated
        callback && callback(mappedValue)
        return mappedValue
      })
    })
  }

  function mountIndexListener(
    proxyStoreToWriteTo,
    proxyListenerMountedPromise,
    onRestart,
    cancelRestart,
    dontPersistIndex
  ) {
    const childValues = {}

    function handleHydratedData( data) {
      const mappedData = mapFunction ? mapFunction(data) : data

      return mappedData
    }

    let lastChildrenObj
    function handleAddedAndRemovedChildren(
      childrenObj,
      trigger,
      internalIdOfRefreshQueueItem,
      multiListener
    ) {
      // it's important we uniquely identify this hydration group, we are likely to clear triggers
      // while the next group is hydrating, if we get change in the index before this hydration
      // is complete.
      const groupId = Util.guid()

      const newChildrenObj = { children: childrenObj }
      const addedAndRemoved = parseAddedAndRemovedChildren(
        lastChildrenObj,
        newChildrenObj
      )

      // the initial callback will have no trigger,
      // so let's just generate a new index
      const triggerIndex = trigger
        ? trigger.index
        : incrementGlobalTriggerCount()
      const initialTriggerForNewChildren = {
        type: "_dohSynthetic",
        value: 1,
        index: triggerIndex,
        path: Util.guid(),
        forwardingTrigger: trigger
      }

      // if we have any children to add we should force enqueue their trigger
      // to make sure we don't have any other callback between now and
      // each hydrated item
      if (addedAndRemoved.added.length && internalIdOfRefreshQueueItem) {
        multiListener._haltAndReplaceItem(
          internalIdOfRefreshQueueItem,
          initialTriggerForNewChildren
        )
      }

      addedAndRemoved.added.forEach(id => {
        multiListener._addTriggerPath(
          `fake-${groupId}-${id}`,
          initialTriggerForNewChildren
        )
      })

      const childrenHydratedPromises = addedAndRemoved.added.map(id => {
        opts.debug && console.log("adding hydrator for", id)
        return multiListener
          ._addListener(
            hydratorDataHandler(id),
            id,
            initialTriggerForNewChildren
          )
          .then(_ => id)
      })

      Promise.all(childrenHydratedPromises).then(res => {
        res.forEach(
          id =>
            multiListener &&
            multiListener._clearTriggerPathsForReceiver(`fake-${groupId}-${id}`)
        )
      })

      addedAndRemoved.removed.forEach(id => {
        opts.debug && console.log("doh removing id ", id)
        multiListener._removeListener(id)
      })

      Object.keys(childrenObj).forEach(id => {
        childValues[id] = childrenObj[id]
      })

      lastChildrenObj = newChildrenObj

      return {
        added: childrenHydratedPromises,
        removed: addedAndRemoved.removed
      }
    }

    function persistHydratedValues(values, writeOpts, proxyStoreToWriteTo) {
      const allValuesObj = {}
      Object.keys(values).forEach(id => {
        const value = values[id]

        allValuesObj[id] = handleHydratedData(value)
      })

      opts.debug && console.log("persisitng", allValuesObj, writeOpts)

      if (!dontPersistIndex) {
        allValuesObj._index = childValues
      }

      proxyStoreToWriteTo.set("store", allValuesObj, false, writeOpts)
    }

    // mounting logic

    const writesToPersistOnceProxyIsMounted = []
    let proxyPromiseIsResolved = false
    proxyListenerMountedPromise.then(() => {
      opts.debug &&
        console.log("running pending writes", writesToPersistOnceProxyIsMounted)
      proxyPromiseIsResolved = true
      writesToPersistOnceProxyIsMounted.forEach(_ => _())
    })

    const multiListener = new MultiListener(
      [listDataHandler],
      null,
      opts.debug,
      opts.stallTime,
      onRestart,
      cancelRestart
    )

    multiListener.on(
      (res, _, trigger, compositePaths, internalIdOfRefreshQueueItem) => {
        const childrenObj = res[returnedName] || {}
        const preRes = Util.deepCopy(res)
        delete res[returnedName]

        const addedAndRemoved = handleAddedAndRemovedChildren(
          childrenObj,
          trigger,
          internalIdOfRefreshQueueItem,
          multiListener
        )

        // we always force the change event UNLESS we're waiting on children
        // to hydrate
        const forceChangeEvent = !addedAndRemoved.added.length
          ? ["store"]
          : null

        addedAndRemoved.removed.forEach(id => {
          delete res[id]
        })

        opts.debug &&
          console.log(
            "new doh data",
            preRes,
            Util.deepCopy(res),
            trigger,
            compositePaths,
            forceChangeEvent
          )

        if (forceChangeEvent) {
          opts.debug &&
            console.log(
              "sending the persist with force change",
              forceChangeEvent
            )

          const persistFn = () =>
            persistHydratedValues(
              Util.deepCopy(res),
              {
                forceChangeEvent,
                triggerOverride: trigger,
                compositePathsOverride: compositePaths,
                debug: opts.debug
              },
              proxyStoreToWriteTo
            )

          if (proxyPromiseIsResolved) {
            opts.debug && console.log("making straight write")
            persistFn()
          } else {
            opts.debug && console.log("queueing write")
            writesToPersistOnceProxyIsMounted.push(persistFn)
          }
        }
      }
    )

    return multiListener.off
  }

  function ensureBound(callback, _, onRestart, cancelRestart) {
    const { handler, store } = buildProxyStore()
    let offNow = false
    let offProxyDatastore

    opts.debug && console.log("ensuring bound")

    const initTime = Date.now()
    const gracePeriod = Number.isNaN(parseInt(opts.restartGracePeriod))
      ? 30000
      : opts.restartGracePeriod

    let restartTimeout
    onRestart =
      onRestart ||
      (() => {
        clearTimeout(restartTimeout)
        restartTimeout = setTimeout(() => {
          offFn()
          ensureBound(callback)
        }, gracePeriod - (Date.now() - initTime))
      })

    cancelRestart =
      cancelRestart ||
      (() => {
        clearTimeout(restartTimeout)
      })

    function mountProxyDatastoreListener() {
      opts.debug && console.warn("mounting on listener")
      let firstProxyCallback = true
      return new Promise(resolve => {
        const finalCallback = function(
          val,
          name,
          path,
          _type,
          triggerPath,
          compositeValues,
          compositePaths
        ) {
          if (offNow) {
            return
          }

          if (firstProxyCallback) {
            opts.debug &&
              console.warn(
                "mounted on listener, now triggering writes from the index listener"
              )
            firstProxyCallback = false
            resolve()
            return
          }

          if (val._index) {
            const indexCache = val._index
            delete val._index
            Object.defineProperty(val, "_index", { value: indexCache })
          }

          const mappedValue = valueMapFunction ? valueMapFunction(val) : val

          opts.debug && console.log("calling back up", mappedValue)

          // make the index not enumerable

          callback(
            mappedValue,
            name,
            path,
            _type,
            triggerPath,
            compositeValues,
            compositePaths
          )
        }

        offProxyDatastore = handler().on(finalCallback, opts.debug)
      })
    }

    const proxyMountedPromise = mountProxyDatastoreListener()

    const offIndexListener = mountIndexListener(
      store,
      proxyMountedPromise,
      onRestart,
      cancelRestart
    )

    const offFn = function() {
      clearTimeout(restartTimeout)
      offNow = true
      offIndexListener()
      offProxyDatastore && offProxyDatastore()
    }

    offFunctions.push(offFn)

    return offFn
  }

  const { handler: onChildHandler, store: onChildStore } = buildProxyStore()
  let offOnChildIndexListener

  function mountOnChildAdded(callback) {
    opts.debug && console.log("onChildStore", onChildStore, onChildHandler)
    if (!offOnChildIndexListener) {
      const dontPersistIndex = true
      offOnChildIndexListener = mountIndexListener(
        onChildStore,
        Promise.resolve(),
        null,
        null,
        dontPersistIndex
      )
    }

    const offChildAdded = onChildHandler().onChildAdded(callback)
    offFunctions.push(offChildAdded)
  }

  function mountOnChildRemoved(callback) {
    opts.debug && console.log("onChildStore", onChildStore, onChildHandler)
    if (!offOnChildIndexListener) {
      offOnChildIndexListener = mountIndexListener(
        onChildStore,
        Promise.resolve(),
        null,
        null,
        dontPersistIndex
      )
    }

    const offChildRemoved = onChildHandler().onChildRemoved(callback)
    offFunctions.push(offChildRemoved)
  }

  this.off = function() {
    offFunctions.forEach(_ => _())
    offOnChildIndexListener && offOnChildIndexListener()
    offOnChildIndexListener = null
  }

  this.name = listDataHandler.name

  this.once = once
  // we don't forward triggers for onChildAdded/removed, becuase we don't have any use
  // for those right now
  this.onChildRemoved = mountOnChildRemoved
  this.onChildAdded = mountOnChildAdded
  this.on = ensureBound
  this.identifier = `${listDataHandler.identifier}~${
    hydratorDataHandler.handlerName
  }~${hydratorDataHandler.handlerType}~${JSON.stringify(opts)}`
  this.map = mapFn => {
    valueMapFunction = mapFn
    return this
  }
}

module.exports = Hydrator
