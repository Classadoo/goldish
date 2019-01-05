const CurrentTimeHandler = require('./logic/core/CurrentTimeHandler')
const Hydrator = require('./logic/core/Hydrator')
const initializeWilddog = require('./logic/initializers/initializeWilddog')
const initializeFirebase = require('./logic/initializers/initializeFirebase')
const initializeInMemory = require('./logic/initializers/initializeInMemory')
const initializeInMemoryUser = require('./logic/initializers/initializeInMemoryUser')
const initializeAnchorParams = require('./logic/initializers/initializeAnchorParams')
const MultiListener = require('./logic/core/MultiListener')

module.exports = {
  initializeWilddog: initializeWilddog,
  initializeFirebase: initializeFirebase,
  initializeInMemory: initializeInMemory,
  initializeInMemoryUser: initializeInMemoryUser,
  initializeAnchorParams: initializeAnchorParams,
  CurrentTimeHandler: CurrentTimeHandler,
  MultiListener: MultiListener,
  Hydrator: Hydrator
}
