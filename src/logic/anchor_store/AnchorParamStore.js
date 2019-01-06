const Util = require('../../common/Util.js')

function AnchorParamStore() {
  const handlers = {}
  let lastHash = getParams()

  function getParams() {
    return Util.getQueryParams(window.location.hash.slice(1))
  }

  function cleanKey(key) {
    // this will get passed paths from datahandlers, but we don't really want to store those.
    return key
      .split('/')
      .filter(Boolean)
      .join('-')
  }

  function set(_key, value) {
    const key = cleanKey(_key)
    const current = getParams()

    if (value && typeof value === 'object') {
      value = JSON.stringify(value)
    }

    if (value === null || typeof value === 'undefined') {
      delete current[key]
    } else {
      current[key] = value
    }

    const newHash = Util.buildQueryString(current)

    window.location.hash = newHash
  }

  function convertUndefinedToNull(value) {
    if (typeof value === 'undefined') {
      return null
    }
    return value
  }

  function get(_key) {
    const key = cleanKey(_key)
    let res = convertUndefinedToNull(getParams()[key])

    try {
      res = JSON.parse(res)
      if (typeof res === 'number') {
        res = res.toString()
      }
      return res
    } catch (e) {
      return res
    }
  }

  function addHandler(_key, type, handler) {
    const key = cleanKey(_key)

    if (type !== 'value') {
      throw Error("AnchorParamStore only supports 'value' listeners.")
    }

    const currentHandlers = handlers[key] || {}
    const handlerId = Util.guid()
    currentHandlers[handlerId] = handler
    handlers[key] = currentHandlers

    // we don't want to fire in this event loop, otherwise we won't be able to
    // call off on this handler during the callback.
    const firstCallbackTimeout = setTimeout(() => {
      handler(get(key), key)
    }, 1)

    return function() {
      clearTimeout(firstCallbackTimeout)
      delete currentHandlers[handlerId]
    }
  }

  function fireHandlers(key, value) {
    const handlersForKey = handlers[key] || {}
    Object.values(handlersForKey).forEach(handler => {
      handler(value, key)
    })
  }

  function removeHandler(_key, handler) {
    const key = cleanKey(_key)

    if (handler) {
      if (handler.__inMemoryRefIndex) {
        handlers[key] && handlers[key].splice(handler.__inMemoryRefIndex, 1)
      }
    } else {
      delete handlers[key]
    }
  }

  window.addEventListener('hashchange', () => {
    const currentHash = getParams()

    const pathsToFire = {}

    Object.keys(currentHash).forEach(_newKey => {
      const newKey = cleanKey(_newKey)
      if (lastHash[newKey] !== currentHash[newKey]) {
        pathsToFire[newKey] = 1
      }
    })

    Object.keys(lastHash).forEach(oldKey => {
      if (lastHash[oldKey] !== currentHash[oldKey]) {
        pathsToFire[oldKey] = 1
      }
    })

    Object.keys(pathsToFire).forEach(key => {
      fireHandlers(key, get(key))
    })

    lastHash = currentHash
  })

  this.set = set
  this.get = get
  this.addHandler = addHandler
  this.removeHandler = removeHandler
}

module.exports = AnchorParamStore
