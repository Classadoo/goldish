const { initializeFirebase } = require("../../dist/core/goldish")
const seedData = require("./seed_data")

module.exports = pathMap => {
  const firebaseInitData = {
    projectId: "brackish-inventory-example",
    webApiKey: "AIzaSyAh5JORu7LUTMlwf31Dg2sS7tTBPV3vh7k"
  }

  const base = "david"

  const { dataHandlers: remote } = initializeFirebase(
    pathMap,
    firebaseInitData,
    { pathBase: base }
  )

  remote._root().once(data => {
    !data && remote._root().set(seedData)
  })

  return remote
}
