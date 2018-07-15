const incrementGlobalTriggerCount = require('./incrementGlobalTriggerCount.js')
const Util = require('../../common/Util.js')

function CurrentUser(authHandlerPromise) {
  const cachedCallbacks = {}

  function UserPropHandler(prop) {
    const type = 'CurrentUser'
    const name = prop

    this.name = name

    this.type = type

    const isAnonymous = true

    this.on = function (callback) {
      let allOff = false
      // unset props return undefined, so to make sure we don't erroneously
      // suppress props that are undefined from alerting we init our last value
      // to something we KNOW won't be in the user object
      let lastValue = '~~~classadoo initial value~~~'

      const propSpecificCallback = (user) => {
        user = user || {}

        // Don't refire if this prop didn't change. For example, uid doesn't need to fire
        // if we updated the email address.
        const value = prop ? user[prop] : user
        if (value === lastValue) {
          return
        }
        lastValue = value
        if (!allOff) {
          const propName = prop || 'user'
          callback(value, propName, propName, type, {
            path: propName, type, value, index: incrementGlobalTriggerCount(),
          })
        }
      }

      const offPromise = authHandlerPromise.then(handler => handler.onAuthStateChanged(propSpecificCallback))

      const callbackId = Util.guid()
      cachedCallbacks[prop] = cachedCallbacks[prop] || {}
      cachedCallbacks[prop][callbackId] = propSpecificCallback

      // need to return a function for "off"
      return function () {
        delete cachedCallbacks[prop][callbackId]

        allOff = true
        offPromise.then(_ => _())
      }
    }

    this.once = function (callback) {
      return authHandlerPromise.then((authHandler) => {
        const user = authHandler.currentUser || {}

        const value = prop ? user[prop] : user
        const propName = prop || 'user'

        callback && callback(value, propName)
        return value
      })
    }

    this.log = () => {
      // eslint-disable-next-line no-console
      this.once().then(console.log)
    }

    this._refPromise = function () {
      const propName = prop || 'user'
      return Promise.resolve({
        path: propName,
      })
    }
  }

  function forceRefresh(propName) {
    const callbacks = cachedCallbacks[propName] || {}
    authHandlerPromise.then((authHandler) => {
      Object.values(callbacks).forEach(_ => _(authHandler.currentUser))
    })
  }

  this.identifier = 'CurrentUserListener'

  // for use when the users anonymous state changes, which doesn't trigger
  // onAuthStateChanged

  this._forceRefresh = forceRefresh
  this.user = () => new UserPropHandler()
  this.uid = () => new UserPropHandler('uid')
  this.displayName = () => new UserPropHandler('displayName')
  this.isAnonymous = () => new UserPropHandler('isAnonymous')
  this.isSim = () => new UserPropHandler('isSim')
  this.isInMem = () => new UserPropHandler('isInMem')
  this.signOut = () => authHandlerPromise.then(auth => auth.signOut())
}

module.exports = CurrentUser
