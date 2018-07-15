const buildFirebaseOrWilddogRefFactory = require('./buildFirebaseOrWilddogRefFactory')
const RefBuilders = require('../core/RefBuilders')
const DataHandlers = require('../core/DataHandlers')

function inializeWilddogDataHandlers(wilddog, pathMap) {
  // these vars are globally defined in the jade file, they come from the server.

  const remote = wilddog.database().ref()

  const refFactory = buildFirebaseOrWilddogRefFactory(remote)
  const serverValues = { TIMESTAMP: wilddog.sync().ServerValue.TIMESTAMP }

  const dataHandlers = new DataHandlers(refFactory, serverValues, 'wilddog')
  const allRefBuilders = RefBuilders(refFactory, pathMap)
  dataHandlers.buildFromRefBuilderMap(allRefBuilders)

  return dataHandlers
}

module.exports = inializeWilddogDataHandlers
