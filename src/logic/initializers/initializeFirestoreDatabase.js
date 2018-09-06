const initializeFirebase = require('./initializeFirebase')
const initializeFirestoreDataHandlers = require('./initializeFirestoreDataHandlers.js')
const appendBaseToAllPathsInPathMap = require('./appendBaseToAllPathsInPathMap')

const initializeFirestoreDatabase = (pathMap, initData, opts) => {
  const { firebase, currentUser } = initializeFirebase(initData)

  pathMap._root = ''

  if (opts.pathBase) {
    appendBaseToAllPathsInPathMap(pathMap, opts.pathBase)
  }

  const dataHandlers = initializeFirestoreDataHandlers(firebase, pathMap)

  return { dataHandlers, currentUser }
}

module.exports = initializeFirestoreDatabase