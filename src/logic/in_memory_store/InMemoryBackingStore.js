function InMemoryBackingStore(initialData) {
  const store = initialData || {}

  this.get = function (key) {
    return store[key]
  }

  this.set = function (key, value) {
    store[key] = value
  }

  this.delete = function (key) {
    delete store[key]
  }
}

module.exports = InMemoryBackingStore
