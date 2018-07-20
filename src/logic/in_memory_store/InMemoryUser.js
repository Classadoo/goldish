function InMemoryUser(userProps = {}) {
  this.displayName = userProps.displayName || 'Sim User'
  this.uid = userProps.uid || '575530'
  this.isInMem = true
}

module.exports = InMemoryUser
