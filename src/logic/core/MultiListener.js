const incrementGlobalTriggerCount = require('./incrementGlobalTriggerCount')
const MultiListener = require('./BaseMultiListener')
const Util = require('../../common/Util.js')

function AutoRestartingMultiListener(dataListeners, ignoreTrigger, debug, stuckWarningWaitTime, noRestartGracePeriod = 30000) {
  const initTime = Date.now()
  let underlying
  let restartTimeout

  const offCachingListeners = Object.values(dataListeners).map(_ => _.on(_ => _))

  function restart() {
    clearTimeout(restartTimeout)
    restartTimeout = setTimeout(() => {
      const cachedCallback = underlying.callback
      const lastRes = underlying._getLastRes()
      underlying.off()
      init(lastRes)
      underlying.on(cachedCallback)
    }, noRestartGracePeriod - (Date.now() - initTime))
  }

  function cancelRestart() {
    clearTimeout(restartTimeout)
  }

  function init(initialLastRes) {
    underlying = new MultiListener(
      dataListeners,
      ignoreTrigger,
      debug,
      stuckWarningWaitTime,
      restart,
      cancelRestart,
      initialLastRes,
    )
  }

  this.off = function () {
    offCachingListeners.forEach(_ => _())
    clearTimeout(restartTimeout)
    return underlying.off()
  }

  // used by DOH
  this._addListener = function (listener, id, initialTrigger) {
    return underlying._addListener(listener, id, initialTrigger)
  }

  this._removeListener = function (id) {
    return underlying._removeListener(id)
  }

  this._addTriggerPath = function (id, trigger) {
    return underlying._addTriggerPath(id, trigger)
  }

  this._clearTriggerPathsForReceiver = function (receiverId) {
    return underlying._clearTriggerPathsForReceiver(receiverId)
  }

  this._haltAndReplaceItem = function (internalIdToHalt, newTrigger) {
    return underlying._haltAndReplaceItem(internalIdToHalt, newTrigger)
  }

  this.buildPathId = (path, type) => underlying.buildPathId(path, type)


  this.on = function (externalCallback) {
    return underlying.on(externalCallback)
  }

  this.map = function (tranformFunction) {
    return {
      on: (externalCallback) => {
        const type = 'mapped-multilistener'
        const path = Util.guid()
        const name = 'mapped-multilistener'

        const newMl = new AutoRestartingMultiListener(dataListeners, ignoreTrigger, debug, stuckWarningWaitTime, noRestartGracePeriod)
        newMl.on((res, lastRes, trigger, compositePaths) => {
          const triggerToReturn = trigger || {
            type, path, value: Util.guid(), index: incrementGlobalTriggerCount(),
          }

          let transformedVal
          try {
            transformedVal = tranformFunction(res)
          } catch (e) {
            console.error('ERROR in MultiListener map transform:', e)
            transformedVal = null
          }

          externalCallback(transformedVal, name, path, type, triggerToReturn, [], compositePaths)
        })

        return () => {
          newMl && newMl.off()
        }
      },
    }
  }

  init()
}

module.exports = AutoRestartingMultiListener
