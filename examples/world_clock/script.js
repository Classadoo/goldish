const {
  initializeInMemory,
  initializeFirebase,
  CurrentTimeHandler,
  MultiListener
} = require("../../dist/core/brackish")
const { Input, DateTime, WithData } = require("../../dist/ui/brackish-ui")

const React = require("react")
const ReactDOM = require("react-dom")

const firebaseInitData = {
  projectId: "shovel-world-clock-example",
  webApiKey: "AIzaSyDUyeiWmd-Twjc-Xiuwql0LMcPqmmQWZw4"
}

const remoteDataPathMap = {
  offsets: ["offsets", ""],
  offsetTime: ["offsets", "", "time"]
}

const localDataPathMap = {
  selectedOffsetId: ["selectedOffsetId"],
  userName: ["userName"]
}

const { dataHandlers: remote } = initializeFirebase(
  remoteDataPathMap,
  firebaseInitData
)

const { dataHandlers: local } = initializeInMemory(localDataPathMap)

const selectedOffsetHandler = remote.offsetTime(
  local.userName(),
  local.selectedOffsetId()
)

const offsetTimeHandler = new MultiListener([
  new CurrentTimeHandler(),
  selectedOffsetHandler
]).map(({ currentTime, offsetTime }) => {
  return currentTime + (parseInt(offsetTime) || 0)
})

const OffsetDisplay = WithData(({ offsetId, selectedOffsetId }) => {
  const selectOffset = () => {
    local.selectedOffsetId().set(offsetId)
  }

  return (
    <div style={offsetId === selectedOffsetId ? { background: "blue" } : {}}>
      <div>
        <Input handler={remote.offsetTime(local.userName(), offsetId)} />
      </div>
      <button onClick={selectOffset}>select</button>
    </div>
  )
})

const Display = WithData(({ offsets, dataHandlers }) => {
  const addOffset = () => {
    dataHandlers.offsets.push({ time: 0 })
  }

  return (
    <div>
      <div>
        User: <Input handler={local.userName()} />
      </div>
      <div>
        <button onClick={addOffset}>+New</button>
      </div>
      <div>
        {Object.keys(offsets || {}).map(offsetId => (
          <OffsetDisplay
            key={offsetId}
            offsetId={offsetId}
            selectedOffsetId={local.selectedOffsetId()}
          />
        ))}
      </div>
      <DateTime handler={offsetTimeHandler} />
    </div>
  )
})

ReactDOM.render(
  <Display offsets={remote.offsets(local.userName())} />,
  document.getElementById("root")
)
