// a generic wrapper for an storage that doesn't respond to remote events
// i.e. session or in memeory storage.

const Util = require('../../common/Util.js')
const InMemoryBackingStore = require('./InMemoryBackingStore.js')

function InMemoryStorage(backingStore) {
  let pendingEvents = []
  let pendingWrites = {}
  let pendingChildWrites = {}
  let handler
  const store = backingStore ? new InMemoryBackingStore(backingStore) : new InMemoryBackingStore()

  // this isn't need for anything in memory
  function startWrite() {}

  function endWrite(holdEvents, opts) {
    try {
      const changes = Object.keys(pendingWrites).map((key) => {
        const newValue = pendingWrites[key]
        const oldValue = Util.deepCopy(get(key))

        if (newValue === null) {
          store.delete(key)
        } else {
          store.set(key, newValue)
        }

        if (pendingChildWrites[key]) {
          delete pendingChildWrites[key]
        }

        return { key, newData: newValue, oldData: oldValue }
      })

      const childRemovedChanges = Object.keys(pendingChildWrites).map((key) => {
        const current = store.get(key)

        const deletedChildren = pendingChildWrites[key]

        if (current) {
          let currentChildrenCopy = null

          if (current.children) {
            currentChildrenCopy = Util.extend({}, current.children)

            deletedChildren.forEach((child) => {
              delete current.children[child]
            })
          }

          return { key, newData: current, oldData: Util.extend(current, { children: currentChildrenCopy }) }
        }
      }).filter(Boolean)

      pendingEvents = pendingEvents.concat(changes.concat(childRemovedChanges))

      pendingWrites = {}
      pendingChildWrites = {}

      if (!holdEvents) {
        const eventsToFire = pendingEvents
        pendingEvents = []
        handler && handler(eventsToFire, opts)
      }
    } catch (e) {
      pendingEvents = []
      pendingWrites = {}
      pendingChildWrites = {}
      throw e
    }
  }

  function set(key, value) {
    pendingWrites[key] = value
  }

  function get(key) {
    return store.get(key)
  }

  function remove(key) {
    pendingWrites[key] = null
  }

  function removeChild(parent, key) {
    pendingChildWrites[parent] = pendingChildWrites[parent] || []
    pendingChildWrites[parent].push(key)
  }

  function registerChangeListener(_handler) {
    handler = _handler
  }

  this.set = set
  this.get = get
  this.remove = remove
  this.store = store
  this.registerChangeListener = registerChangeListener
  this.startWrite = startWrite
  this.endWrite = endWrite
  this.removeChild = removeChild
}

module.exports = InMemoryStorage
