const React = require("react")
const WithData = require("./WithData")

const DataInput = WithData(({ data, dataHandlers }) => {
  let el

  const handleUpdate = () => {
    dataHandlers.data.set(el.value)
  }

  return (
    <input
      ref={ref => (el = ref)}
      onKeyUp={handleUpdate}
      defaultValue={data}
      type="text"
    />
  )
})

const Input = props => <DataInput dataHandlers={{ data: props.handler }} />

module.exports = Input
