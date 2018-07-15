const React = require('react')
const MultiListener = require('../logic/core/MultiListener')
const Util = require('../common/Util.js')

// a helper which will only return initial data once
// all listeners have responded, then will update
// whenever any listener responds.

function withData(Component, _opts) {
  const { defaultElement, debug, mountCallback } = (_opts || {})

  class newComponent extends React.Component {
    componentWillMount() {
      this.mountListeners(this.props)
    }

    componentWillReceiveProps(nextProps) {
      const nextIdentifiers = Object.values(nextProps.dataHandlers || {}).map(dataListener => dataListener.identifier)
      const prevIdentifiers = Object.values(this.props.dataHandlers || {}).map(dataListener => dataListener.identifier)

      if (!Util.objectEq(nextIdentifiers, prevIdentifiers)) {
        this.unmountListeners()
        this.mountListeners(nextProps)
      }
    }

    componentWillUnmount() {
      this.unmountListeners()
    }

    mountListeners(props) {
      const dataHandlers = props.dataHandlers || []

      this.multiListener = new MultiListener(dataHandlers, false, debug || props._dataDebug)

      this.setters = {} 
      if (dataHandlers instanceof Array) {
        dataHandlers.forEach((handler) => {
          this.setters[handler.name] = handler.set
        })
      } else {
        Object.keys(dataHandlers).map((handlerName) => {
          const handler = dataHandlers[handlerName]
          this.setters[handlerName] = handler.set
        })
      }

      this.multiListener.on((cache) => {
        this.gotData = true
        this.setState(cache)
      })

      if (!Object.keys(dataHandlers).length) {
        this.gotData = true
      }
    }

    unmountListeners() {
      this.multiListener && this.multiListener.off()
    }

    render() {
      const props = this.props
      if (this.gotData) {
        if (mountCallback) {
          const self = this
          setTimeout(() => {
            mountCallback && mountCallback(self)
          }, 1)
        }
        return <Component {...this.state} {...props} setters={this.setters} />
      } else if (defaultElement) {
        return defaultElement
      }
      return <div style={{ display: 'inline' }} className="react-loading"></div>
    }
  }
  return newComponent
}

module.exports = withData
