const buildFirebaseOrWilddogRefFactory = require("./buildFirebaseOrWilddogRefFactory")
const RefBuilders = require("../core/RefBuilders.js")
const DataHandlers = require("../core/DataHandlers.js")

function inializeFirebaseDataHandlers(firebase, pathMap) {
  // these vars are globally defined in the jade file, they come from the server.

  const remote = firebase.database().ref()

  const refFactory = buildFirebaseOrWilddogRefFactory(remote)
  const serverValues = firebase.database.ServerValue

  const dataHandlers = new DataHandlers(refFactory, serverValues, "firebase")
  const allRefBuilders = RefBuilders(refFactory, pathMap)
  dataHandlers.buildFromRefBuilderMap(allRefBuilders)

  return dataHandlers
}

module.exports = inializeFirebaseDataHandlers
