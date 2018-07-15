const clonedeep = require('lodash.clonedeep')
const lodashEq = require('lodash.isequal')

const Util = new function () {
  this.getQueryParams = function (qs) {
    qs = qs.split('+').join(' ')

    let params = {},
      tokens,
      re = /[?&]?([^=]+)=([^&]*)/g

    while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2])
    }

    return params
  }

  this.getOneQueryParam = function (key) {
    const results = new RegExp(`[\?&]${key}=([^&#]*)`).exec(window.location.href) || []
    return results[1] || 0
  }

  this.buildQueryString = function (queryObject) {
    const queryList = []
    Object.keys(queryObject).forEach((query) => {
      const value = queryObject[query]
      if (value !== null) {
        queryList.push(`${query}=${value}`)
      }
    })
    return queryList.join('&')
  }

  this.fixUnresolvedServerTime = function (timeMs, defaultTime) {
    if (typeof timeMs === 'object' && timeMs['.sv']) {
      // Somethings bogus, or we've offline. Just fix it up.
      return defaultTime
    }
    return timeMs
  }

  this.guid = function () {
    let d = new Date().getTime()
    try {
      if (window.performance && typeof window.performance.now === 'function') {
        d += window.performance.now()
      }
    } catch (err) {
      // window is not defined.
    }
    const uuid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, (c) => {
      const r = (d + Math.random() * 16) % 16 | 0
      d = Math.floor(d / 16)
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
    return uuid
  }

  this.chunkArray = function (array, chunkSize) {
    const res = []
    for (let i = 0, j = array.length; i < j; i += chunkSize) {
      res.push(array.slice(i, i + chunkSize))
    }

    return res
  }

  this.deepCopy = clonedeep

  this.extend = function (oldObj, extend, deep) {
    const newObj = {}
    Object.assign(newObj, oldObj)
    Object.assign(newObj, extend)
    return newObj
  }

  this.objectEq = function (obj1, obj2) {
    return lodashEq(obj1, obj2)
  }

  this.objectValues = function (object) {
    return Object.keys(object || {}).map(key => object[key])
  }

  this.findChangedKeys = (obj1, obj2) => {
    const keyObj = {}
    Object.keys(obj1).concat(Object.keys(obj2)).forEach((key) => {
      if (!lodashEq(obj1[key], obj2[key])) {
        keyObj[key] = 1
      }
    })

    return Object.keys(keyObj)
  }

  this.hashString = function (string) {
    let hash = 0
    let i
    let chr
    let len
    if (string.length === 0) return hash
    for (i = 0, len = string.length; i < len; i++) {
      chr = string.charCodeAt(i)
      hash = ((hash << 5) - hash) + chr
      hash |= 0 // Convert to 32bit integer
    }
    return hash
  }

  this.randomElement = function (array) {
    return array[Math.floor(Math.random() * array.length)]
  }

  function EvictingQueue(maxLength) {
    let store = []

    this.push = function (item) {
      if (store.length === maxLength) {
        store.splice(0, 1)
        store.push(item)
      } else {
        store.push(item)
      }
    }

    this.pop = function () {
      return store.pop()
    }

    this.reset = function () {
      store = []
    }

    this.store = function () {
      return store
    }

    this.insert = function (indexToInsertBefore, item) {
      store.splice(indexToInsertBefore, 0, item)
    }

    this.removeAllAfter = function (index) {
      store.splice(index + 1)
    }

    this.length = function () {
      return store.length
    }
  }

  this.EvictingQueue = EvictingQueue

  this.getValueFromPath = function (object, path) {
    const pathPieces = path.split('/').filter(Boolean)
    if (!pathPieces.length) {
      return undefined
    }

    return pathPieces.reduce((prevValue, currentKey) => prevValue && prevValue[currentKey], object)
  }

  function resolvePromisedData(dataObject) {
    return Promise.resolve(dataObject)
  }

  this.resolvePromisedData = resolvePromisedData

  function recursivelyDeleteKeyFromObject(object, keyToDelete) {
    Object.keys(object).forEach((key) => {
      if (key === keyToDelete) {
        delete object[key]
      } else if (object[key] && typeof object[key] === 'object') {
        recursivelyDeleteKeyFromObject(object[key], keyToDelete)
      }
    })
  }

  this.recursivelyDeleteKeyFromObject = recursivelyDeleteKeyFromObject

  function camelCaseToRegular(string) {
    // from https://stackoverflow.com/questions/18379254/regex-to-split-camel-case/18379502
    return string.replace(/([a-z](?=[A-Z]))/g, '$1 ').toLowerCase()
  }

  this.camelCaseToRegular = camelCaseToRegular

  // from lodash.math
  this.arrayMedian = function (arr) {
    arr = arr.slice(0) // create copy
    const middle = (arr.length + 1) / 2
    const sorted = arr.sort((a, b) => a - b)
    return (sorted.length % 2) ? sorted[middle - 1] : (sorted[middle - 1.5] + sorted[middle - 0.5]) / 2
  }

  this.arrayAverage = array => array.reduce((a, b) => a + b) / array.length
}()

module.exports = Util
