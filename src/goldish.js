const CurrentTimeHandler = require("./logic/core/CurrentTimeHandler")
const Hydrator = require("./logic/core/Hydrator")
const initializeWilddog = require("./logic/initializers/initializeWilddog")
const initializeFirestoreDatabase = require("./logic/initializers/initializeFirestoreDatabase")
const initializeFirebaseDatabase = require("./logic/initializers/initializeFirebaseDatabase")
const initializeInMemory = require("./logic/initializers/initializeInMemory")
const MultiListener = require("./logic/core/MultiListener")

module.exports = {
  initializeWilddog: initializeWilddog,
  initializeFirestore: initializeFirestoreDatabase,
  initializeFirebase: initializeFirebaseDatabase,
  initializeInMemory: initializeInMemory,
  CurrentTimeHandler: CurrentTimeHandler,
  MultiListener: MultiListener,
  Hydrator: Hydrator
}
