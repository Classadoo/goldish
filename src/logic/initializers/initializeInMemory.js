const CurrentUser = require("../core/CurrentUser")
const InMemoryUser = require("../in_memory_store/InMemoryUser")
const initializeInMemoryDataHandlers = require("./initializeInMemoryDataHandlers")
const InMemoryAuthHandler = require("../in_memory_store/InMemoryAuthHandler")

function initializeInMemory(pathMap, _opts) {
  const { userProps, seedData } = _opts || {}
  const dataHandlers = initializeInMemoryDataHandlers(pathMap, { seedData })
  const inMemUser = new InMemoryUser(userProps)
  const inMemoryAuthHandler = new InMemoryAuthHandler(inMemUser)

  const currentUser = new CurrentUser(Promise.resolve(inMemoryAuthHandler))

  return { dataHandlers, currentUser }
}

module.exports = initializeInMemory
