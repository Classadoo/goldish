function InMemoryServerValues() {
  Object.defineProperty(this, 'TIMESTAMP', {
    get() {
      return Date.now()
    },
  })
}

module.exports = InMemoryServerValues
