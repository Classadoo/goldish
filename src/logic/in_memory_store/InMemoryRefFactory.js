const MockSnapshot = require('./MockSnapshot')
const Util = require('../../common/Util.js')

function InMemoryRefFactory(store, debug) {
  function build(path) {
    return new Ref(path)
  }

  function allData() {
    return store.get('')
  }

  function Ref(path, queryOpts) {
    const listeners = {}

    const self = this

    this.on = function (listenerType, _handler) {
      const handler = function (value, pathToFire, opts) {
        _handler(new MockSnapshot(value, pathToFire, self), opts)
      }

      listeners[listenerType] = listeners[listenerType] || {}

      const offFun = store.addHandler(path, listenerType, handler, queryOpts)

      const listenerId = Util.guid()
      listeners[listenerType][listenerId] = offFun
      _handler.__inMemoryRefId = listenerId

      return offFun
    }

    this.once = function (listenerType, handler) {
      const snap = new MockSnapshot(store.get(path), path, self)
      handler(snap)
      return { then: _ => _(snap), catch: _ => _ }
    }

    this.push = function (data) {
      const id = `mem-${Date.now()}-${Util.guid()}`
      const newPath = `${path}/${id}`
      store.set(newPath, data)
      return { then: _ => _(new MockSnapshot(data, newPath, self)), catch: _ => _ }
    }
    this.path = path

    const pathComponents = path.split('/').filter(Boolean)

    this.key = pathComponents[pathComponents.length - 1]

    this.set = function (data, debug) {
      const start = Date.now()
      store.set(path, data)
      debug && console.log('after set', Date.now() - start)
      return { then: _ => _(new MockSnapshot(data, path, self)), catch: _ => _ }
    }

    this.update = function (data) {
      let isMultiUpdate = false
      Object.keys(data || {}).forEach((childOrPath) => {
        if (childOrPath.indexOf('/') > -1) {
          isMultiUpdate = true
        }
      })

      if (isMultiUpdate) {
        Object.keys(data).forEach((path, i) => {
          // we hold on firing events until we've reached the end of the multiwrite list
          const holdEvents = (Object.keys(data).length - 1) !== i

          writeUpdate(path, data[path], holdEvents)
        })
      } else {
        writeUpdate('', data)
      }

      function writeUpdate(childPath, data, holdEvents) {
        const writePath = `${path}/${childPath}`

        let oldData = store.get(writePath)

        if (oldData && typeof oldData === 'object' && data && typeof data === 'object') {
          oldData = Object.assign(oldData, data)
          store.set(writePath, oldData, holdEvents)
        } else {
          store.set(writePath, data, holdEvents)
        }
      }

      return Promise.resolve()
    }
    this.child = function (childPath) {
      return new Ref(`${path}/${childPath}`)
    }

    this.ref = this

    this.off = function (listenerType, handler) {
      if (listeners[listenerType] && listeners[listenerType][handler.__inMemoryRefId]) {
        listeners[listenerType][handler.__inMemoryRefId]()
      }
    }

    this.transaction = function (handler) {
      const data = store.get(path)
      const newData = handler(data)
      store.set(path, newData)

      return Promise.resolve({ snapshot: new MockSnapshot(newData, path, self) })
    }

    this.remove = function () {
      store.set(path, null)
      return Promise.resolve()
    }

    this._syncGet = function () {
      return store.get(path)
    }

    const queryFunctions = ['limitToLast', 'limitToFirst', 'orderByChild', 'orderByKey', 'orderByPriority', 'equalTo', 'orderByValue', 'startAt']

    queryFunctions.forEach((query) => {
      this[query] = function (opt) {
        const queryOptUpdateObj = {}
        queryOptUpdateObj[query] = opt
        return new Ref(path, Util.extend(queryOpts, queryOptUpdateObj))
      }
    })
  }

  this.build = build
  this.allData = allData
}

module.exports = InMemoryRefFactory
