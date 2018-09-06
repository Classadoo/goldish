const CurrentUser = require('../core/CurrentUser')

function initializeFirebase(initData) {
  if (!initData.projectId || !initData.webApiKey) {
    throw new Error('missing firebase app name or firebase web key')
  }

  const firebaseConfig = {
    apiKey: initData.webApiKey,
    authDomain: `${initData.projectId}.firebaseapp.com`,
    databaseURL: `${initData.projectId}.firebaseio.com`,
    projectId: initData.projectId
  }

  firebase.initializeApp(firebaseConfig)

  // we auto add the root to the path map, for easy debugging access

  const currentUser = new CurrentUser(Promise.resolve(firebase.auth()))

  return { firebase, currentUser }
}

module.exports = initializeFirebase
