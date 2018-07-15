const CurrentUser = require('../core/CurrentUser')
const InMemoryUser = require('../in_memory_store/InMemoryUser')
const initializeInMemoryDataHandlers = require('./initializeInMemoryDataHandlers')
const InMemoryAuthHandler = require('../in_memory_store/InMemoryAuthHandler')

function initializeInMemoryShovel(pathMap, _userProps) {
  const userProps = _userProps || {}
  const dataHandlers = initializeInMemoryDataHandlers(pathMap)
  const inMemUser = new InMemoryUser(userProps)
  const inMemoryAuthHandler = new InMemoryAuthHandler(inMemUser)

  const currentUser = new CurrentUser(Promise.resolve(inMemoryAuthHandler))

  return { dataHandlers, currentUser }
}

module.exports = initializeInMemoryShovel
