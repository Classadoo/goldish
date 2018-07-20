const CurrentUser = require("../core/CurrentUser")
const initializeFirebaseDataHandlers = require("./initializeFirebaseDataHandlers.js")
const appendBaseToAllPathsInPathMap = require('./appendBaseToAllPathsInPathMap')

function initializeFirebaseShovel(pathMap, initData, opts) {
  if (!initData.projectId || !initData.webApiKey) {
    throw new Error("missing firebase app name or firebase web key")
  }

  const firebaseConfig = {
    apiKey: initData.webApiKey,
    authDomain: `${initData.projectId}.firebaseapp.com`,
    databaseURL: `${initData.projectId}.firebaseio.com`
  }

  firebase.initializeApp(firebaseConfig)

  // we auto add the root to the path map, for easy debugging access
  pathMap._root = ''

  if (opts.pathBase) {
    appendBaseToAllPathsInPathMap(pathMap, opts.pathBase)
  }

  const dataHandlers = initializeFirebaseDataHandlers(firebase, pathMap)

  const currentUser = new CurrentUser(firebase.auth)

  return { dataHandlers, currentUser }
}

module.exports = initializeFirebaseShovel
