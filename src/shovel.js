const initializeWilddogShovel = require('./logic/initializers/initializeWilddogShovel')
const initializeFirebaseShovel = require('./logic/initializers/initializeFirebaseShovel')
const initializeInMemoryShovel = require('./logic/initializers/initializeInMemoryShovel')

module.exports = {
  initializeWilddog: initializeWilddogShovel,
  initializeFirebase: initializeFirebaseShovel,
  initializeInMemory: initializeInMemoryShovel,
}
