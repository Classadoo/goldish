const { initializeFirestore } = require("../../dist/core/goldish")
const seedData = require("./seed_data")

module.exports = pathMap => {
  const firebaseInitData = {
    projectId: "brackish-inventory-example",
    webApiKey: "AIzaSyAh5JORu7LUTMlwf31Dg2sS7tTBPV3vh7k"
  }

  const base = "david/test"

  const { dataHandlers: remote } = initializeFirestore(
    pathMap,
    firebaseInitData,
    { pathBase: base }
  )
  console.log('wowowo')
  remote._root().once(data => {
    console.log('running', data)
    !data && remote._root().set(seedData)
  })

  return remote
}
