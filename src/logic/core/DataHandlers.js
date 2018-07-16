const Util = require('../../common/Util.js')
const incrementGlobalTriggerCount = require('./incrementGlobalTriggerCount.js')
const normalizeRef = require('./normalizeRef.js')

function DataHandlers(refBuilder, serverValues, _type) {
  const d = this

  let _persistRef

  function persistRef() {
    _persistRef && _persistRef.apply(this, arguments)
  }

  this.bindRefPersister = function (persistRef) {
    _persistRef = persistRef
  }

  // like session, anchor, persistent, or any other label.
  this.type = _type

  this._refBuilder = refBuilder

  let dry
  let dryWrites = []

  function Handler(refGetter, name) {
    this.type = _type
    this.name = name
    this.identifier = `+${refGetter.identifier}~${name}~${_type}+`

    const self = this

    const queryFunctions = ['limitToLast', 'limitToFirst', 'orderByChild', 'orderByKey', 'orderByPriority', 'equalTo', 'orderByValue', 'startAt']

    queryFunctions.forEach((query) => {
      this[query] = function () {
        const args = [].slice.call(arguments)
        const newRefGetter = refGetter.buildNewWithQuery(query, args)
        return new Handler(newRefGetter, name)
      }
    })

    function getRef() {
      return refGetter.once().then(refData => normalizeRef(refData.ref))
    }

    this.on = function (callback, debug) {
      // triggerPath is the path to the data which
      // changed to cause the ref to change.

      let offOldRefFunction

      let resolveFiredOncePromise
      const firedOncePromise = new Promise(((resolve) => { resolveFiredOncePromise = resolve }))

      let lastRefFiredOncePromise
      let allOff = false

      const attachHandler = function (ref, baseTriggerPath, compositeValues, compositePaths) {
        debug && console.log('attaching new handler')

        let cachedLastRefPromise = lastRefFiredOncePromise || Promise.resolve()
        if (offOldRefFunction) {
          const cachedOffOldRefFunction = offOldRefFunction
          cachedLastRefPromise.then(() => {
            cachedOffOldRefFunction()
          })
        }

        if (ref instanceof TypeError) {
          // the ref had some invalid params, just callback null
          cachedLastRefPromise = cachedLastRefPromise.then(() => {
            const triggerPath = baseTriggerPath || {
              type: self.type, path: null, value: null, index: incrementGlobalTriggerCount(),
            }

            if (!allOff) {
              callback(null, name, null, _type, triggerPath, compositeValues || {}, compositePaths || [])
              resolveFiredOncePromise()
            }
          })
        } else if (ref instanceof Error) {
          throw ref
        } else {
          let resolveLastRefFiredOncePromise
          lastRefFiredOncePromise = new Promise(((resolve) => { resolveLastRefFiredOncePromise = resolve }))

          function handler(_snapshot, _opts) {
            const opts = _opts || {}
            const snapshot = normalizeRef(_snapshot)

            const path = snapshot.ref.path.toString()

            persistRef('value', path)

            const triggerPath = opts.triggerOverride || baseTriggerPath || {
              type: self.type, path: normalizeRef(ref).path, value: snapshot.val(), index: incrementGlobalTriggerCount(),
            }

            debug && console.log('in Dh')

            // we wait until the last ref has fired to fire this one, and we chain
            // to make sure that subsequent resolutions always fire in order
            cachedLastRefPromise = cachedLastRefPromise.then(() => {
              if (!allOff) {
                debug && console.log('actually calling back', _snapshot.val(), opts, opts.compositePathsOverride || compositePaths)
                callback(snapshot.val(), name, path, _type, triggerPath, compositeValues, opts.compositePathsOverride || compositePaths, opts)
                resolveFiredOncePromise()
                resolveLastRefFiredOncePromise()
              }
            })

            // we don't return a trigger path except the first time a ref changes
            baseTriggerPath = null
          }

          offOldRefFunction = function () {
            ref.off('value', handler)
          }

          ref.on('value', handler)
        }
      }

      const offRefGetter = refGetter.on(attachHandler)

      const offFunction = function () {
        allOff = true
        offRefGetter()
        offOldRefFunction && offOldRefFunction()
      }

      offFunction.firedOnce = firedOncePromise
      return offFunction
    }

    this.map = function (mapFn) {
      const handlerCopy = Util.deepCopy(this)
      const copyOn = handlerCopy.on
      const copyOnce = handlerCopy.once

      const getTransformedVal = (res) => {
        try {
          return mapFn(res)
        } catch (e) {
          console.error('ERROR in data handler map transform:', e)
          return null
        }
      }

      handlerCopy.on = function (callback) {
        return copyOn(function () {
          const args = [].slice.call(arguments)
          args[0] = getTransformedVal(args[0])
          callback.apply(callback, args)
        })
      }

      handlerCopy.once = function (callback) {
        return copyOnce(function () {
          const args = [].slice.call(arguments)
          args[0] = getTransformedVal(args[0])
          callback && callback.apply(callback, args)
        }).then(value => mapFn(value))
      }

      return handlerCopy
    }

    this.filter = function (filterFn, defaultValue) {
      const handlerCopy = Util.deepCopy(this)
      const copyOn = handlerCopy.on
      const copyOnce = handlerCopy.once
      
      const getFilterResult = (res) => {
        try {
          return filterFn(res)
        } catch (e) {
          console.error('ERROR in data handler filter function:', e)
          return null
        }
      }

      handlerCopy.on = function (callback) {
        let lastValidResult = typeof defaultValue === 'undefined' ? null : defaultValue
        console.log('what?', lastValidResult)

        return copyOn(function () {
          const args = [].slice.call(arguments)
          console.log('sss', getFilterResult(args[0]))
          args[0] = getFilterResult(args[0]) ? args[0] : lastValidResult
          lastValidResult = args[0]
          callback.apply(callback, args)
        })
      }

      handlerCopy.once = function (callback) {
        return copyOnce(function () {
          const args = [].slice.call(arguments)
          args[0] = getFilterResult(args[0]) ? args[0] : defaultValue || null
          callback && callback.apply(callback, args)
        }).then(value => {
          return getFilterResult(value) ? value : defaultValue || null
        })
      }

      return handlerCopy
    }

    // turns firebase keys into a list:
    this.asList = function () {
      return this.map(ref => Object.keys(ref || {}))
    }

    this.onChildAdded = function (callback) {
      let deferredHandlerTimeout
      let offFun
      let compositeValues

      function handler(snapshot) {
        const normalized = normalizeRef(snapshot)
        const path = normalized.ref.path.toString()
        persistRef('child_added', `${path}/${normalized.key}`)
        callback(normalized.key, normalized.val(), compositeValues)
      }

      // if we are switching to a new ref let's
      // wait to fire until the next event loop to
      // make sure the onChildRemoved events fire first
      function deferredHandlerCall(defer) {
        return function () {
          const args = [].slice.call(arguments)
          if (defer) {
            deferredHandlerTimeout = setTimeout(function () {
              handler.apply(this, args)
            }, 1)
          } else {
            handler.apply(this, args)
          }
        }
      }

      const attachHandler = function (ref, _triggerPath, _compositeValues) {
        offFun && offFun()

        if (ref instanceof TypeError) {
          // the ref had some invalid params, don't call back yet
        } else if (ref instanceof Error) {
          throw ref
        } else {
          // we only defer if the handler is firing because the ref
          // has changed
          compositeValues = _compositeValues
          const deferredHandler = deferredHandlerCall(!!offFun)
          offFun = function () {
            ref.off('child_added', deferredHandler)
            clearTimeout(deferredHandlerTimeout)
          }
          ref.on('child_added', deferredHandler)
        }
      }

      const offRefGetter = refGetter.on(attachHandler)

      return function () {
        offRefGetter()
        offFun && offFun()
      }
    }

    this.onChildRemoved = function (callback) {
      let oldRef

      let cachedSnapshots = []
      let compositeValues

      const handler = function (snapshot) {
        const normalized = normalizeRef(snapshot)
        const path = normalized.ref.path.toString()
        persistRef('child_removed', `${path}/${normalized.key}`)

        cachedSnapshots = cachedSnapshots.filter(snapshot => normalizeRef(snapshot).key !== normalized.key)

        callback(normalized.key, normalized.val(), compositeValues)
      }

      const storeChildKey = function (snapshot) {
        cachedSnapshots.push(snapshot)
      }

      const attachHandler = function (ref, _triggerPath, _compositeValues) {
        if (oldRef) {
          // If path has changed, call the callback for every key we ever got.
          cachedSnapshots.forEach((snapshot) => {
            handler(snapshot)
          })

          oldRef.off('child_removed', handler)
          oldRef.off('child_added', storeChildKey)
        }

        if (ref instanceof TypeError) {
          // the ref had some invalid params don't do anything
        } else if (ref instanceof Error) {
          throw ref
        } else {
          oldRef = ref
          compositeValues = _compositeValues
          ref.on('child_added', storeChildKey)
          ref.on('child_removed', handler)
        }
      }

      const offRefGetter = refGetter.on(attachHandler)

      return function () {
        offRefGetter()
        oldRef && oldRef.off('child_removed', handler)
      }
    }

    this.once = function (callback) {
      return new Promise(((resolve, reject) => {
        let compositeValues

        const handler = function (_snapshot) {
          const snapshot = normalizeRef(_snapshot)
          const path = snapshot.ref.path.toString()
          persistRef('once', path)
          resolve(snapshot.val())
          callback && callback(snapshot.val(), name, compositeValues)
        }

        refGetter.once().then((refData) => {
          const ref = refData.ref
          if (ref instanceof TypeError) {
            resolve(null)
            callback && callback(null, name, [])
          } else if (ref instanceof Error) {
            throw refData
          } else {
            compositeValues = refData.compositeValues
            ref.once('value', handler)
          }
        })
      }))
    }

    this.log = function () {
      // eslint-disable-next-line no-console
      this.once().then(console.log)
    }

    function getRefOrCancel(action, callback) {
      return refGetter.once().then((refData) => {
        const ref = refData.ref
        if (ref instanceof Error) {
          // throw Error("error for " + action + ": " + ref.message)
          // console.error("error for " + action + ": " + ref.message);
          // return a promise like object that never actually resolves
          return {
            then() {},
            catch() {},
          }
        }
        return callback(ref)
      })
    }

    this.update = function (data) {
      const resolvedData = Util.resolvePromisedData(data)
      return getRefOrCancel(
        'update',
        ref => resolvedData.then(resolvedData => ref.update(resolvedData).then(() => normalizeRef(ref))),
      )
    }

    this.set = function (data) {
      const cachedDry = dry
      const resolvedData = Util.resolvePromisedData(data)
      const res = getRefOrCancel(
        'set',
        ref => resolvedData.then((resolvedData) => {
          if (cachedDry) {
            const multiWriteObj = {}
            multiWriteObj[ref.path.toString()] = resolvedData
            return multiWriteObj
          }

          return ref.set(resolvedData).then(() => normalizeRef(ref))
        }),
      )

      cachedDry && dryWrites.push(res)

      return res
    }

    this.transaction = function (transformerFunction) {
      return getRefOrCancel('transaction', ref => ref.transaction((val) => {
        const path = ref.path.toString()
        const res = transformerFunction(val)
        persistRef('transaction', path)

        return res
      }).then(res => res.snapshot.val()))
    }

    this.push = function (data) {
      const resolvedData = Util.resolvePromisedData(data)
      return getRefOrCancel(
        'push',
        ref => resolvedData.then(resolvedData => ref.push(resolvedData).then(normalizeRef)),
      )
    }

    this.remove = function () {
      return getRefOrCancel('remove', (ref) => {
        if (!(ref instanceof Error)) {
          return ref.remove()
        }
        console.warn('tried to remove a ref, but the ref returned an error, ignoring', ref)
        return Promise.resolve()
      })
    }

    this._refPromise = function () {
      return getRef()
    }

    this.toString = function () {
      return name
    }

    // This adds references using the current handler as the foreign object.
    this.addReferences = function (foreignKeyHandlers, relationshipData) {
      const cachedDry = dry
      const res = Promise.all([getRef(), Util.resolvePromisedData(relationshipData)]).then((res) => {
        const ref = res[0]
        const objectId = ref.key

        const multiUpdateObj = {}
        const updateObjsComplete = foreignKeyHandlers.map(handler => handler._refPromise().then((foreignRef) => {
          const foreignReferencePath = `${foreignRef.path}/${objectId}`
          multiUpdateObj[`${foreignReferencePath}/reference`] = 1
          multiUpdateObj[`${ref.path}/references/${encodeURIComponent(foreignReferencePath)}`] = 1

          if (relationshipData) {
            multiUpdateObj[`${foreignReferencePath}/data`] = relationshipData
          }
        }))

        return Promise.all(updateObjsComplete).then(() => (cachedDry ? multiUpdateObj : multiSet(multiUpdateObj)))
      })

      cachedDry && dryWrites.push(res)

      return res
    }

    // This adds a reference to a foreign object FROM this handler
    this.addReferenceTo = function (foreignKeyHandler) {
      const cachedDry = dry

      const res = getRef().then((ref) => {
        const multiUpdateObj = {}

        const updateObjComplete = foreignKeyHandler._refPromise().then((foreignRef) => {
          const foreignKey = foreignRef.key
          const foreignReferencePath = `${foreignRef.path}/references/${encodeURIComponent(ref.path)}`
          multiUpdateObj[foreignReferencePath] = 1
          multiUpdateObj[ref.path] = foreignKey
        })

        return updateObjComplete.then(() => (cachedDry ? multiUpdateObj : multiSet(multiUpdateObj)))
      })

      cachedDry && dryWrites.push(res)

      return res
    }

    // this adds reference which references another reference.
    // Exmaple: lesson project map is a mapping from demoId (projectId reference) to templateId (projectIdReference)
    this.addDoubleReference = function (foreignKeyKeyHandler, foreignKeyValueHandler) {
      return getRef().then((ref) => {
        const objectId = ref.key

        const multiUpdateObj = {}
        const reverseReferenceObj = {}

        const updateObjComplete = Promise.all([foreignKeyKeyHandler._refPromise(), foreignKeyValueHandler._refPromise()]).then((res) => {
          const foreignKeyKeyRef = res[0]
          const foreignKeyValueRef = res[1]

          const foreignKeyKey = foreignKeyKeyRef.key
          const foreignKeyValue = foreignKeyValueRef.key

          const foreignKeyKeyReferencePath = `${foreignKeyKeyRef.path}/references/${encodeURIComponent(`${ref.path}/${foreignKeyKey}`)}`
          const foreignKeyValueReferencePath = `${foreignKeyValueRef.path}/references/${encodeURIComponent(`${ref.path}/${foreignKeyKey}`)}`

          multiUpdateObj[foreignKeyKeyReferencePath] = 1
          multiUpdateObj[foreignKeyValueReferencePath] = 1

          multiUpdateObj[`${ref.path}/${foreignKeyKey}`] = foreignKeyValue
        })

        return updateObjComplete.then(() => multiSet(multiUpdateObj))
      })
    }

    this.removeReferences = function (foreignKeyHandlers) {
      return getRef().then((ref) => {
        const objectId = ref.key

        const multiUpdateObj = {}
        const reverseReferenceObj = {}

        const updateObjsComplete = foreignKeyHandlers.map(handler => handler._refPromise().then((foreignRef) => {
          const foreignReferencePath = `${foreignRef.path}/${objectId}`

          multiUpdateObj[foreignReferencePath] = null
          multiUpdateObj[`${ref.path}/references/${encodeURIComponent(foreignReferencePath)}`] = null
        }))

        return Promise.all(updateObjsComplete).then(() => multiSet(multiUpdateObj))
      })
    }

    this.replaceReferenceTo = function (oldForeignKeyHandler, newForeignKeyHandler) {
      return getRef().then((ref) => {
        const objectId = ref.key

        const multiUpdateObj = {}
        const reverseReferenceObj = {}

        const updateObjComplete = Promise.all([
          oldForeignKeyHandler._refPromise(),
          newForeignKeyHandler._refPromise(),
        ]).then((res) => {
          const oldRef = res[0]
          const newRef = res[1]

          const refPathToDelete = `${oldRef.path}/references/${encodeURIComponent(ref.path)}`
          const refPathToAdd = `${newRef.path}/references/${encodeURIComponent(ref.path)}`
          const foreignKeyToAdd = newRef.key

          if (oldRef.path) {
            multiUpdateObj[refPathToDelete] = null
          }

          multiUpdateObj[refPathToAdd] = 1
          multiUpdateObj[ref.path] = foreignKeyToAdd
        })

        return updateObjComplete.then(() => multiSet(multiUpdateObj))
      })
    }

    this.removeReferenceTo = function (foreignKeyHandler) {
      return getRef().then((ref) => {
        const objectId = ref.key

        const multiUpdateObj = {}
        const reverseReferenceObj = {}

        const updateObjComplete = foreignKeyHandler._refPromise().then((foreignRef) => {
          const foreignReferencePath = `${foreignRef.path}/references/${encodeURIComponent(ref.path)}`

          multiUpdateObj[foreignReferencePath] = null
          multiUpdateObj[ref.path] = null
        })

        return updateObjComplete.then(() => multiSet(multiUpdateObj))
      })
    }

    this.delete = function () {
      return getRef().then(ref => new Promise(((resolve, reject) => {
        ref.child('/references').once('value', (snapshot) => {
          const references = snapshot.val()
          const encodedPaths = Object.keys(references || {})

          const multiUpdateObj = {}
          encodedPaths.forEach((encodedPath) => {
            const path = decodeURIComponent(encodedPath)
            multiUpdateObj[path] = null
          })

          multiUpdateObj[`${ref.path}/deleted`] = true

          return multiSet(multiUpdateObj).then(() => {
            resolve()
          }, reject)
        })
      })))
    }

    this.compositePaths = function () {
      const compositePathPromises = refGetter.compositeHandlers.map((handler) => {
        if (handler.compositePaths) {
          return handler.compositePaths()
        }
        return []
      })

      const currentPathPromise = getRef().then((ref) => {
        if (ref instanceof Error) {
          return []
        }
        !ref.path && console.warn(ref)
        return [{ type: _type, path: ref.path.toString() }]
      })

      return Promise.all([currentPathPromise, Promise.all(compositePathPromises)]).then((res) => {
        const currentPath = res[0]
        const compositePaths = res[1]

        let allPaths = []

        compositePaths.forEach((paths) => {
          allPaths = allPaths.concat(paths)
        })

        allPaths = allPaths.concat(currentPath)

        return allPaths
      })
    }

    // only usable for in mem refs, otherwise will throw an error
    this._getSync = function () {
      try {
        return refGetter._syncRef()._syncGet()
      } catch (e) {
        return null
      }
    }
  }

  // makes all the writes which occur within this function get grouped into
  // one write. Right now only addReferences and addReferenceTo are supported
  function groupWrites(writeFn) {
    dry = true
    writeFn()

    let writesComplete = Promise.resolve()
    if (dryWrites.length) {
      const multiWriteComplete = Promise.all(dryWrites).then((writes) => {
        const allWrites = writes.reduce((built, nextObj) => Object.assign(built, nextObj), {})

        return d.multiWriter._writeMultiUpdate(allWrites)
      })

      writesComplete = multiWriteComplete
    }

    dryWrites = []
    dry = false
    return writesComplete
  }

  function buildFromRefBuilderMap(refBuilderMap) {
    function build(localRefBuilderMap) {
      const handlerMap = {}
      Object.keys(localRefBuilderMap).forEach((possiblePathName) => {
        const possibleRefBuilder = localRefBuilderMap[possiblePathName]

        function buildHandler() {
          const args = [].slice.call(arguments)

          return new Handler(possibleRefBuilder.apply(this, args), possiblePathName)
        }

        if (typeof possibleRefBuilder === 'function') {
          handlerMap[possiblePathName] = buildHandler
          handlerMap[possiblePathName].handlerName = possiblePathName
          handlerMap[possiblePathName].handlerType = _type
        } else {
          handlerMap[possiblePathName] = build(possibleRefBuilder)
        }
      })

      return handlerMap
    }

    Object.assign(this, build(refBuilderMap))
  }

  function multiSet(data) {
    return d.multiWriter._writeMultiUpdate(data)
  }

  this.serverValues = serverValues
  this.groupWrites = groupWrites
  this.buildFromRefBuilderMap = buildFromRefBuilderMap
}

module.exports = DataHandlers
