const Util = require('../../common/Util.js')

// a helper which will only return initial data once
// all listeners have responded, then will update
// whenever any listener responds.

function isBrowser() {
  return typeof window !== 'undefined'
}

function RefreshQueueManager(debug, stuckWarningWaitTime, pathCounts, onStuck, onUnstuck) {
  const refreshQueue = []

  let internalId = 0
  let stuckWarningTimeout
  let warnedAboutBeingStuck
  let lastTimeFirstIdChanged
  let lastFirstIdInQueue
  let allOff

  function checkForStuckState() {
    if (allOff || !isBrowser()) {
      return
    }

    const firstIdInQueue = refreshQueue[0] && refreshQueue[0].internalId

    if (lastFirstIdInQueue !== firstIdInQueue || !refreshQueue.length) {
      lastTimeFirstIdChanged = Date.now()
      if (warnedAboutBeingStuck) {
        console.warn('Multilistener is unstuck')
        onUnstuck()

        warnedAboutBeingStuck = false
      }
    } else {
      const timeSinceLastChange = Date.now() - lastTimeFirstIdChanged

      if (timeSinceLastChange > stuckWarningWaitTime) {
        console.warn('Multilistener may be stuck: ', refreshQueue.length, refreshQueue[0].values, timeSinceLastChange, pathCounts, window.stuckWarningCount)

        onStuck()
       
        warnedAboutBeingStuck = true
      }
    }

    lastFirstIdInQueue = firstIdInQueue
  }

  function registerStuckSensor() {
    clearTimeout(stuckWarningTimeout)
    checkForStuckState()
    stuckWarningTimeout = setTimeout(checkForStuckState, stuckWarningWaitTime)
  }

  function add(id, receiverId, index, onActive) {
    const existingQueueIndex = refreshQueue.findIndex((entry) => {
      if (entry.id === id && !entry.receivers.includes(receiverId)) {
        return true
      }
    })

    let triggerGroup
    if (existingQueueIndex > -1) {
      triggerGroup = refreshQueue[existingQueueIndex]
      // we keep the lowest index, to make sure we always fire in order. Although
      // in theory all indices for a give trigger should be contiguous.
      triggerGroup.receivers.push(receiverId)
      triggerGroup.index = Math.min(triggerGroup.index, index)
      triggerGroup.count++
      refreshQueue.sort((a, b) => a.index - b.index)
    } else {
      internalId++
      const completeEntry = complete.bind(this, internalId)
      const newEntry = {
        index, id, receivers: [receiverId], internalId, complete: completeEntry, count: 1, values: {}, onActiveFns: [],
      }
      refreshQueue.push(newEntry)
      refreshQueue.sort((a, b) => a.index - b.index)
      triggerGroup = newEntry
    }

    onActive && triggerGroup.onActiveFns.push(onActive)

    registerStuckSensor()

    return triggerGroup
  }

  function complete(cachedInternalId, completeFn) {
    const refreshQueueIndex = refreshQueue.findIndex((entry) => {
      if (entry.internalId === cachedInternalId) {
        return true
      }
    })

    debug && console.log('trying to complete refresh queue', cachedInternalId, refreshQueueIndex, Util.deepCopy(refreshQueue))

    refreshQueue[refreshQueueIndex].completeFn = completeFn

    if (refreshQueueIndex === 0) {
      // we intentionally clear out the entries from the refresh queue BEFORE completing them,
      // as DOH will try to forceAdd entry in it's complete callback
      while (refreshQueue[0] && refreshQueue[0].completeFn) {
        const entryToComplete = refreshQueue[refreshQueueIndex]
        entryToComplete.onActiveFns.forEach(_ => _())
        entryToComplete.onActiveFns = []
        const shouldRemove = entryToComplete.completeFn(entryToComplete.internalId)
        if (!entryToComplete.halted && shouldRemove) {
          refreshQueue.splice(0, 1)
          checkForStuckState()
        } else {
          delete entryToComplete.completeFn
          entryToComplete.halted = false
          debug && console.log('entry completion halted', Util.deepCopy(entryToComplete))
        }
      }
    } else {
      debug && console.log('waiting for earlier requests to complete', cachedInternalId, Util.deepCopy(refreshQueue))
    }
  }

  function _haltAndReplaceItem(internalIdToReplace, newTriggerId) {
    debug && console.log('halting and replacing refresh queue item', internalIdToReplace, newTriggerId, Util.deepCopy(refreshQueue))
    const indexToReplace = refreshQueue.findIndex((entry) => {
      if (entry.internalId === internalIdToReplace) {
        return true
      }
    })

    const entryToReplace = refreshQueue[indexToReplace]
    entryToReplace.halted = true

    entryToReplace.id = newTriggerId
    entryToReplace.count = 0
    entryToReplace.values = {}
    entryToReplace.receivers = []
    delete entryToReplace.completeFn
    entryToReplace.onActiveFns = []
  }

  function offStuckMonitoring() {
    allOff = true
    clearTimeout(stuckWarningTimeout)
  }

  this.add = add
  this._haltAndReplaceItem = _haltAndReplaceItem
  this.offStuckMonitoring = offStuckMonitoring
}

module.exports = RefreshQueueManager
