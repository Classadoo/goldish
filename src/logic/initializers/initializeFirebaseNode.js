const initializeFirebaseDataHandlers = require('./initializeFirebaseDataHandlers.js')
const appendBaseToAllPathsInPathMap = require('./appendBaseToAllPathsInPathMap')

function initializeFirebaseNode(pathMap, firebase, initData, _opts) {
  const opts = _opts || {}

  if (!initData.projectId || !initData.credential) {
    throw new Error('missing firebase app name or credential')
  }

  const firebaseConfig = {
    credential: initData.credential,
    databaseURL: `${initData.projectId}.firebaseio.com`
  }

  firebase.initializeApp(firebaseConfig)

  // we auto add the root to the path map, for easy debugging access
  pathMap._root = ''

  if (opts.pathBase) {
    appendBaseToAllPathsInPathMap(pathMap, opts.pathBase)
  }

  const dataHandlers = initializeFirebaseDataHandlers(firebase, pathMap)

  return dataHandlers
}

module.exports = initializeFirebaseNode
