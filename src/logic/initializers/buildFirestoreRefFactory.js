const FirestoreRefWrapper = require('./FirestoreRefWrapper')
const Path = require('path')

const buildFirestoreRefFactory = function(db) {
  return path => {
    const normalizedPath = Path.normalize(path)
      .split('/')
      .filter(_ => _.length)
      .join('/')

    if (normalizedPath === undefined || normalizedPath === '') {
      throw new Error('Cannot pass an empty or undefined path to firestore')
    }

    const pathParts = normalizedPath.split('/')

    const isOddNesting = pathParts.length % 2

    const ref = isOddNesting
      ? db.collection(normalizedPath)
      : db.doc(normalizedPath)

    const refToReturn = new FirestoreRefWrapper(ref, db)

    return Promise.resolve(refToReturn)
  }
}

module.exports = buildFirestoreRefFactory
