const buildFirestoreRefFactory = require('./buildFirestoreRefFactory')
const RefBuilders = require('../core/RefBuilders.js')
const DataHandlers = require('../core/DataHandlers.js')

function inializeFirebaseDataHandlers(firebase, pathMap) {
  // these vars are globally defined in the jade file, they come from the server.

  const db = firebase.firestore()

  const refFactory = buildFirestoreRefFactory(db)
  const serverValues = {
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }

  const dataHandlers = new DataHandlers(refFactory, serverValues, 'firestore')
  const allRefBuilders = RefBuilders(refFactory, pathMap)
  dataHandlers.buildFromRefBuilderMap(allRefBuilders)

  return dataHandlers
}

module.exports = inializeFirebaseDataHandlers
