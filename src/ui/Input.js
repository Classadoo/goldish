const React = require('react')
const WithData = require('./WithData')

const DataInput = WithData(({data, setters}) => {
  let el

  handleUpdate = () => {
    setters.data(ref.value)
  }

  return (
    <input ref={ref => el = ref} onKeyDown={handleUpdate} defaultValue={data} type='text'></input>
  )
})

const Input = props => <DataInput dataHandlers={{data: props.handler}}></DataInput>

module.exports = Input