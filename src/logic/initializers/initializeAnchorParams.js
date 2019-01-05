const InMemoryRefFactory = require('../in_memory_store/InMemoryRefFactory')
const RefBuilders = require('../core/RefBuilders')
const DataHandlers = require('../core/DataHandlers')
const AnchorParamStore = require('../anchor_store/AnchorParamStore')

function initializeAnchorParams(pathMap) {
  const store = new AnchorParamStore()
  const refFactory = new InMemoryRefFactory(store)

  const anchorRefBuilder = function(path) {
    return Promise.resolve(refFactory.build('').child(path))
  }

  const dataHandlers = new DataHandlers(anchorRefBuilder, {}, 'anchor')

  const allRefBuilders = RefBuilders(anchorRefBuilder, pathMap)
  dataHandlers.buildFromRefBuilderMap(allRefBuilders)
  return dataHandlers
}

module.exports = initializeAnchorParams
