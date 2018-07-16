const { initializeInMemory, CurrentTimeHandler, MultiListener } = require('../../dist/shovel')
const { Input, ShortText } = require('../../dist/shovel-ui')
const React = require('react')
const ReactDOM = require('react-dom')

const pathMap = {
  offset: ['offset']
}


const { dataHandlers, currentUser } = initializeInMemory(pathMap)

const offsetHandler = dataHandlers.offset()
.filter((value) => !isNaN(value))

const remoteTimeHandler = new MultiListener([
  new CurrentTimeHandler(),
  offsetHandler
]).map(({currentTime, offset}) => {
  return currentTime + parseInt(offset || 0)
})


const Display = (props) => {
  return (
    <div>      
      <Input handler={dataHandlers.offset()} />
      <ShortText handler={remoteTimeHandler} />
    </div>
  )
}

ReactDOM.render(<Display />, document.getElementById('root'))

