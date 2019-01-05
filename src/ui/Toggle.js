const React = require('react')
const WithData = require('./WithData')

const Toggle = WithData(({ onText, offText, state, listeners }) => {
  const toggle = () => listeners.state.set(!state)

  return <button onClick={toggle}>{state ? onText : offText}</button>
})

const ToggleBuilder = props => (
  <Toggle listeners={{ state: props.state }} {...props} />
)

module.exports = ToggleBuilder
