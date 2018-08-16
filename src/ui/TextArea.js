const React = require("react")
const WithData = require("./WithData")

class TextArea extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  render() {
    const self = this
    const props = self.props
    const state = self.state

    const isFocused = state.focused
    const text = props.text
    const textDataHandler = props.dataHandlers.text
    const placeholder = props.placeholder
    const updateOnShiftEnter = props.updateOnShiftEnter

    function focused() {
      self.setState(() => ({ focused: true }))
    }

    function blurred(e) {
      const text = e.target.value
      textDataHandler.set(text)
      self.setState(() => ({ focused: false }))
    }

    function callOnKeyUp(e) {
      if (!updateOnShiftEnter) {
        const text = e.target.value
        textDataHandler.set(text)
      }
    }

    function lookForShiftEnter(e) {
      if (e.shiftKey && e.which === 13 && updateOnShiftEnter) {
        const text = e.target.value
        textDataHandler.set(text)
        e.preventDefault()
        e.target.blur()
      }
    }

    return (
      <textarea
        className="classadoo-editable-paragraph"
        onFocus={focused}
        onBlur={blurred}
        placeholder={placeholder || "No Text"}
        value={isFocused ? undefined : text || ""}
        defaultValue={isFocused ? text || "" : undefined}
        onKeyUp={callOnKeyUp}
        onKeyDown={lookForShiftEnter}
      />
    )
  }
}

module.exports = WithData(TextArea)
