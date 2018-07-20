const React = require("react")
const WithData = require("./WithData")

const DataInput = WithData(({ text, dataHandlers }) => {
  let el

  const handleUpdate = () => {
    dataHandlers.text.set(el.value)
  }

  return (
    <input
      ref={ref => (el = ref)}
      onKeyUp={handleUpdate}
      defaultValue={text}
      type="text"
    />
  )
})

module.exports = DataInput
