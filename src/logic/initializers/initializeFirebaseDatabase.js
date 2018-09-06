const initializeFirebase = require('./initializeFirebase')
const initializeFirebaseDataHandlers = require('./initializeFirebaseDataHandlers.js')
const appendBaseToAllPathsInPathMap = require('./appendBaseToAllPathsInPathMap')

const initializeFirebaseDatabase = (pathMap, initData, opts) => {
  const { firebase, currentUser } = initializeFirebase(initData)

  pathMap._root = ''

  if (opts.pathBase) {
    appendBaseToAllPathsInPathMap(pathMap, opts.pathBase)
  }

  const dataHandlers = initializeFirebaseDataHandlers(firebase, pathMap)

  return { dataHandlers, currentUser }
}

module.exports = initializeFirebaseDatabase
