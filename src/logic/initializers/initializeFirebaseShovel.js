const CurrentUser = require('../core/CurrentUser')
const initializeFirebaseDataHandlers = require('./initializeFirebaseDataHandlers.js')

function initializeFirebaseShovel(pathMap, initData) {
  if (!initData.projectId || !initData.webApiKey) {
    throw new Error('missing firebase app name or firebase web key')
  }

  const firebaseConfig = {
    apiKey: initData.webApiKey,
    authDomain: `${initData.projectId}.firebaseapp.com`,
    databaseURL: `${initData.projectId}.firebaseio.com`,
  }

  firebase.initializeApp(firebaseConfig)

  const dataHandlers = initializeFirebaseDataHandlers(firebase, pathMap)
  const currentUser = new CurrentUser(firebase.auth)

  return { dataHandlers, currentUser }
}

module.exports = initializeFirebaseShovel
