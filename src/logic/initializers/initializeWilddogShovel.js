const CurrentUser = require('../core/CurrentUser')
const initializeWilddogDataHandlers = require('./initializeWilddogDataHandlers')

function initializeWilddogShovel(pathMap, initData) {
  if (!initData.projectId) {
    console.error('missing wilddog app name')
  }

  const wilddogConfig = {
    authDomain: `${initData.projectId}.wilddog.com`,
    syncURL: `${initData.projectId}.wilddogio.com`,
  }

  wilddog.initializeApp(wilddogConfig, 'DEFAULT')

  wilddog.auth.EmailAuthProvider = wilddog.auth.WilddogAuthProvider.emailCredential

  const dataHandlers = initializeWilddogDataHandlers(wilddog, pathMap)
  const currentUser = new CurrentUser(wilddog.auth)

  return { dataHandlers, currentUser }
}

module.exports = initializeWilddogShovel
