const DataHandlers = require("../core/DataHandlers")
const FlattenedObjectStore = require("../in_memory_store/FlattenedObjectStore")
const InMemoryRefFactory = require("../in_memory_store/InMemoryRefFactory")
const InMemoryServerValues = require("../in_memory_store/InMemoryServerValues")
const InMemoryStorage = require("../in_memory_store/InMemoryStorage")
const RefBuilders = require("../core/RefBuilders")

function initializeInMemoryDataHandlers(pathMap, _opts) {
  const { seedData } = _opts || {}
  const mStore = {}
  const storage = new InMemoryStorage(mStore)
  const inMemoryStore = new FlattenedObjectStore(storage, seedData)

  const inMemoryRefFactory = new InMemoryRefFactory(inMemoryStore)

  const inMemRefBuilder = function(path) {
    return Promise.resolve(inMemoryRefFactory.build("").child(path))
  }

  inMemRefBuilder._sync = function(path) {
    return inMemoryRefFactory.build("").child(path)
  }

  const dataHandlers = new DataHandlers(
    inMemRefBuilder,
    InMemoryServerValues,
    "inMemory"
  )
  const allRefBuilders = RefBuilders(inMemRefBuilder, pathMap)
  dataHandlers.buildFromRefBuilderMap(allRefBuilders)

  return dataHandlers
}

module.exports = initializeInMemoryDataHandlers
