const { initializeInMemory } = require('../../dist/shovel')
const { Input } = require('../../dist/shovel-ui')
const React = require('react')
const ReactDOM = require('react-dom')

const pathMap = {
  offset: ['offset']
}


const { dataHandlers, currentUser } = initializeInMemory(pathMap)

dataHandlers.offset().on((offset) => {
  console.log("change", offset)
})

const Display = (props) => {
  return <Input handler={dataHandlers.offset()} />
}

ReactDOM.render(<Display />, document.getElementById('root'))

