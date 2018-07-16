const Util = require('../../common/Util.js')
const RefreshQueueManager = require('./RefreshQueueManager')

const MultiListener = function (dataListeners, ignoreTrigger, debug, stuckWarningWaitTime = 7000, onStuck, onUnstuck, initialLastRes) {
  const cache = {}
  let callback
  let offFunctions = {}
  // we use this object to keep track of which paths are currently
  // being refreshed and how many callbacks we've received. This allows
  // us to only callback to the user ONCE when a common composite path changes.
  let allOff = false
  const pathCountCache = {}
  const refreshQueue = new RefreshQueueManager(debug, stuckWarningWaitTime, pathCountCache, onStuck, onUnstuck)
  let lastRes = initialLastRes


  // when a handler triggers itself (it's value actually changes) we should still use the
  // ref id of the last composite trigger it saw. Otherwise we can get out of order changes
  // when a composite path changes in the same atomic change as the value at the old composite
  // path (see multiWrittenMultiListenerTest)
  const basisTriggerIndices = {}

  function getCompositePathCounts() {
    const pathCounts = {}

    Object.keys(pathCountCache).map((receiverId) => {
      const pathsForReceiver = pathCountCache[receiverId]
      // dedup paths for each receiver. Ref builders now uses multilisteners
      // and thus each receiver only fires once per path per change.

      pathsForReceiver.forEach((pathIdentifier) => {
        pathCounts[pathIdentifier] = (pathCounts[pathIdentifier] || 0) + 1
      })
    })

    return pathCounts
  }

  function buildPathId(path, type) {
    return `${path}~~~${type}`
  }

  function mountListener(listener, nameOverride, initialTrigger, receiverIdOverride) {
    const receiverId = receiverIdOverride || Util.guid()
    let callbackCount = 0
    return new Promise(((resolve, reject) => {
      if (!listener.on) {
        console.error('listener is invalid: ', listener)
        reject(new Error('listener is invalid'))
        return
      }

      debug && console.log('promise mounting', nameOverride, listener.name)

      let initialCall = true

      const offFunction = listener.on((data, _name, dataPath, type, trigger, compositeValues, _compositePaths) => {
        callbackCount++

        const usingIntitialTrigger = initialCall && initialTrigger
        if (usingIntitialTrigger) {
          trigger = initialTrigger
        }

        const notFirstCall = !initialCall || initialTrigger

        const name = nameOverride || _name || listener.name

        if (trigger) {
          const isSelfTrigger = trigger.path === dataPath && trigger.type === type && trigger.value === data

          if (isSelfTrigger && (compositeValues || []).length && basisTriggerIndices[receiverId]) {
            // if we ever receive more than 1000000 callbacks while waiting for an earlier ref to break
            // AND we change the implementation refresh queue manager to no longer use an array...this MIGHT
            // fire changes out of order.
            const newIndex = basisTriggerIndices[receiverId] + callbackCount / 1000000
            trigger.index = newIndex
          } else {
            basisTriggerIndices[receiverId] = trigger.index
          }
        }

        debug && console.log('got new data for', name, data, trigger)

        const triggerType = trigger ? trigger.type : type
        const triggerPath = trigger && trigger.path ? trigger.path.toString() : dataPath

        // if the json is circular, then just use [object object]
        let triggerValue
        try {
          triggerValue = JSON.stringify(trigger ? trigger.value : data)
        } catch (e) {
          triggerValue = trigger
        }

        const triggerIndex = trigger && trigger.index

        const triggerPathId = buildPathId(triggerPath, triggerType)

        let triggerGroup

        function updatePathCounts() {
          const receiverPathId = buildPathId(dataPath, type)
          const compositePaths = (_compositePaths || []).slice()
          compositePaths.push(receiverPathId)
          pathCountCache[receiverId] = compositePaths
        }

        if (triggerType && triggerPath && notFirstCall && !ignoreTrigger && triggerIndex) {
          const triggerId = `${triggerType}/${triggerPath}/${triggerValue}`


          if (triggerId.indexOf('fullPath') > -1 && window.dropTrigger && drop) {
            console.log('droppign')
            window.dropTrigger = false
            return
          }

          triggerGroup = refreshQueue.add(triggerId, receiverId, triggerIndex, updatePathCounts)
          triggerGroup.values[name] = data

          triggerGroup.complete((internalId) => {
            const pathCounts = getCompositePathCounts()
            const numberOfExpectedRefreshes = pathCounts[triggerPathId] || 0

            debug && console.log('MultiListener trying to complete', trigger, triggerPathId, numberOfExpectedRefreshes, pathCounts)

            if (numberOfExpectedRefreshes <= triggerGroup.count) {
              // we're done with this refresh, now we can callback
              const compositePathsToReturn = Object.keys(getCompositePathCounts())

              Object.assign(cache, triggerGroup.values)
              const triggerToReturn = usingIntitialTrigger ? initialTrigger.forwardingTrigger : trigger
              alertChange(triggerToReturn, compositePathsToReturn, internalId)
              return true
            }

            debug && console.log('MultiListener waiting to fire: ', Util.deepCopy(triggerGroup), trigger, Util.deepCopy(pathCounts))
            return false
          })
        } else if (initialCall) {
          debug && console.log('initial callback for ', name)

          triggerGroup = refreshQueue.add('initial', receiverId, 0)
          triggerGroup.values[name] = data

          triggerGroup.complete((internalId) => {
            const numberOfListenersToWaitFor = Object.keys(dataListeners).length
            updatePathCounts()

            debug && console.log('number of listeners to wait for', numberOfListenersToWaitFor, triggerGroup.count)
            if (numberOfListenersToWaitFor <= triggerGroup.count) {
              const compositePathsToReturn = Object.keys(getCompositePathCounts())
              Object.assign(cache, triggerGroup.values)

              alertChange(null, compositePathsToReturn, internalId)
              return true
            }
            debug && console.log('initial load wait', name, Util.deepCopy(triggerGroup.values))
            return false
          })
        } else {
          cache[name] = data
          const compositePathsToReturn = Object.keys(getCompositePathCounts())
          alertChange(null, compositePathsToReturn)
        }

        initialCall = false
        resolve(cache)
      }, null, onStuck, onUnstuck)

      offFunctions[receiverId] = offFunction
    }))
  }

  function alertChange(trigger, compositePaths, internalId) {
    if (!allOff) {
      debug && console.warn('alerting!', Util.deepCopy(cache), trigger)
      const res = Util.deepCopy(cache)
      try {
        callback(res, lastRes, trigger, compositePaths, internalId)
      } catch (e) {
        Promise.reject(e)
      }

      lastRes = res
    }
  }

  this.off = function () {
    allOff = true
    lastRes = false

    Object.keys(offFunctions).forEach((receiverId) => {
      offFunctions[receiverId] && offFunctions[receiverId]()
    })

    refreshQueue.offStuckMonitoring()

    offFunctions = []
  }

  // used by DOH
  this._addListener = function (listener, id, initialTrigger) {
    return mountListener(listener, id, initialTrigger, id)
  }

  this._removeListener = function (id) {
    delete cache[id]
    offFunctions[id] && offFunctions[id]()
    delete offFunctions[id]
    delete pathCountCache[id]
  }

  this._addTriggerPath = function (id, trigger) {
    pathCountCache[id] = [buildPathId(trigger.path, trigger.type)]
  }

  this._clearTriggerPathsForReceiver = function (receiverId) {
    debug && console.log('clearing trigger path for', receiverId)
    delete pathCountCache[receiverId]
  }

  this._haltAndReplaceItem = function (internalIdToHalt, newTrigger) {
    const newTriggerId = `${newTrigger.type}/${newTrigger.path}/${newTrigger.value}`
    refreshQueue._haltAndReplaceItem(internalIdToHalt, newTriggerId)
  }

  this.buildPathId = buildPathId

  this.on = function (externalCallback) {
    callback = externalCallback
    this.callback = callback

    if (dataListeners instanceof Array) {
      dataListeners.map(listener => mountListener(listener))
    } else {
      Object.keys(dataListeners).map((listenerName) => {
        const listener = dataListeners[listenerName]
        return mountListener(listener, listenerName)
      })
    }
  }

  this._getLastRes = () => lastRes
}

module.exports = MultiListener
