const MockSnapshot = require('../in_memory_store/MockSnapshot')
const Path = require('path')
const Util = require('../../common/Util')

function FirestoreRefWrapper(ref, db) {
  const path = ref.path

  const isCollection = path.split('/').length % 2

  const processSnap = snap => {
    const returnObj = {}

    console.log('shshs', isCollection, path)

    if (isCollection) {
      snap.forEach(doc => {
        console.log('dod', doc.data(), doc, doc.id)
        returnObj[doc.id] = doc.data()
      })

      console.log('data', snap.data && snap.data(), returnObj)
      return new MockSnapshot(returnObj, path, this)
    } else {
      return new MockSnapshot(snap.data(), path, this)
    }
  }

  this.on = function(listenerType, handler) {
    return ref.onSnapshot(snap => {
      handler(processSnap(snap))
    })
  }

  this.once = function(listenerType, handler) {
    const getPromise = ref.get()
    return getPromise.then(snap => {
      const mockSnap = processSnap(snap)
      handler(mockSnap)
      return mockSnap
    })
  }

  this.push = function(data) {
    return ref.add(data).then(docRef => {
      const newId = docRef.id
      const newPath = `${path}/${newId}`
      return new MockSnapshot(data, newPath, this)
    })
  }
  this.path = path

  const pathComponents = path.split('/').filter(Boolean)

  this.key = pathComponents[pathComponents.length - 1]

  this.set = function(data) {
    console.log('set', data)
    let completePromise

    if (typeof data === 'object') {
      const pathMap = Util.pathMapFromObject(data)
      var batch = db.batch()
      Object.keys(pathMap).forEach(childPath => {
        const childData = pathMap[childPath]
        const fullPath = Path.join(path, childPath)
        console.log('setting', fullPath, childData)
        batch.set(db.doc(fullPath), childData)
      })
      completePromise = batch.commit()
    } else {
      if (isCollection) {
        throw new Error(
          `Firestore can only write objects to collection: ${path}`
        )
      }
      completePromise = ref.set(data)
    }

    return completePromise.then(() => {
      return new MockSnapshot(data, path, this)
    })
  }

  this.update = function(data) {
    let completePromise
    if (isCollection) {
      if (typeof data === 'object') {

        const pathMap = Util.pathMapFromObject(data)
        var batch = db.batch()
        Object.keys(pathMap).forEach(childPath => {
          const childData = pathMap[childPath]
          batch.update(ref.doc(childPath), childData)
        })
        completePromise = batch.commit()
      } else {
        throw new Error(
          `Firestore can only write objects to collection: ${path}`
        )
      }
    } else {
      completePromise = ref.update(data)
    }

    return completePromise.then(() => {
      return new MockSnapshot(data, path, this)
    })
  }
  this.child = function(childPath) {
    const newPath = Path.join(path, childPath)
    const pathIsOdd = newPath.split('/').length % 2
    const newRef = pathIsOdd ? ref.doc(childPath) : ref.collection(childPath)

    return new FirestoreRefWrapper(newRef)
  }

  this.ref = this

  this.off = () => {}

  this.transaction = function(handler) {
    db.runTransaction(transaction => {
      // This code may get re-run multiple times if there are conflicts.
      return transaction.get(ref).then(function(sfDoc) {
        const snapToReturn = new MockSnapshot(sfDoc.data(), path, this)
        const returnValue = handler(snapToReturn)

        transaction.set(ref, returnValue)
      })
    })
  }

  this.remove = function() {
    ref.set(path, null)
    return Promise.resolve()
  }
}

module.exports = FirestoreRefWrapper
