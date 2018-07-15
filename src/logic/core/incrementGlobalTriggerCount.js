function incrementGlobalTriggerCount() {
  let globalNamespace

  if (typeof global === 'undefined') {
    globalNamespace = window
  } else {
    globalNamespace = global
  }

  globalNamespace._classadooTriggerCount = globalNamespace._classadooTriggerCount || 0
  return ++globalNamespace._classadooTriggerCount
}

module.exports = incrementGlobalTriggerCount