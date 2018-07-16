const React = require('react')
const WithData = require('./WithData')

const DataInput = WithData(({data, setters}) => {
  let el

  const handleUpdate = () => {
    setters.data(el.value)
  }

  return (
    <input ref={ref => el = ref} onKeyUp={handleUpdate} defaultValue={data} type='text'></input>
  )
})

const Input = props => <DataInput dataHandlers={{data: props.handler}}></DataInput>

module.exports = Input