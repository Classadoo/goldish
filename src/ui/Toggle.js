const React = require("react")
const WithData = require("./WithData")

const Toggle = WithData(({ onText, offText, state, dataHandlers }) => {
  const toggle = () => dataHandlers.state.set(!state)

  return <button onClick={toggle}>{state ? onText : offText}</button>
})

module.exports = Toggle
