const React = require("react")
const WithData = require("./WithData")

const DataInput = WithData(({ text, dataHandlers, updateOnEnter }) => {
  let el

  const update = () => {
    dataHandlers.text.set(el.value)
  }

  const lookForEnter = e => {
    if (e.which === 13) {
      update()
      e.preventDefault()
      el.blur()
    }
  }

  const keyupFn = !updateOnEnter && update
  const keydownFn = updateOnEnter && lookForEnter

  return (
    <input
      ref={ref => (el = ref)}
      onKeyUp={keyupFn}
      onKeyDown={keydownFn}
      defaultValue={text}
      onBlur={update}
      type="text"
    />
  )
})

module.exports = DataInput
