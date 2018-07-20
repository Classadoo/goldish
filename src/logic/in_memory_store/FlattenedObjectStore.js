const Util = require("../../common/Util.js")
const parseAddedAndRemovedChildren = require("../../common/parseAddedAndRemovedChildren")

function isEmptyObject(value) {
  return typeof value === "object" && !Object.keys(value || {}).length
}

function Writer(storage) {
  function writeToStore(parentPath, newUserObj, holdEvents, opts) {
    storage.startWrite()
    const oldStorageObj = getCurrentStorageObject(parentPath)
    const newStorageObj = writeUserObjectToStorage(parentPath, newUserObj)
    removeMissingKeys(newStorageObj, oldStorageObj)

    if (Object.keys(newStorageObj).length) {
      // only write the parent path if we are actually setting some values
      writeParentPath(parentPath)
    }

    storage.endWrite(holdEvents, opts)
  }

  function removePath(path) {
    const clean = cleanPath(path)
    removeChildFromParent(clean)
    storage.remove(clean)
  }

  function writeParentPath(path) {
    if (!path) {
      return
      // if we are trying to add parents to the base path just don't
    }

    const clean = cleanPath(path)
    const components = clean.split("/")

    const builtPath = []
    components.forEach((component, i) => {
      const isLastComponent = i == components.length

      if (!isLastComponent) {
        const currentPath = builtPath.join("/")
        const currentValue = get(currentPath)

        const oldChildren = Util.extend(
          {},
          currentValue && currentValue.children && currentValue.children
        )
        const newChild = components[i]
        let newChildren

        if (oldChildren) {
          // children need to be updated only if the list currently
          // does not contain the new child
          oldChildren[newChild] = 1
          newChildren = oldChildren
        } else {
          newChildren = {}
          newChildren[newChild] = 1
        }

        write(currentPath, { children: newChildren, value: null })

        builtPath.push(component)
      }
    })
  }

  function removeChildFromParent(path) {
    const components = path.split("/")
    const parent = components.slice(0, components.length - 1).join("/")
    const key = components[components.length - 1]

    storage.removeChild(parent, key)
  }

  function writeUserObjectToStorage(parentPath, newUserObj) {
    const localObj = {}

    function parseObj(obj, basePath) {
      if (obj && typeof obj === "object" && !obj.__noParse) {
        const keys = Object.keys(obj)

        const children = {}

        keys.forEach(key => {
          children[key] = 1
        })

        writeOut(basePath, { children, value: null })

        keys.forEach(key => {
          const path = `${basePath}/${key}`
          const childObj = obj[key]
          parseObj(obj[key], path)
        })
      } else if (obj !== null && obj !== undefined) {
        writeOut(basePath, { children: null, value: obj })
      }
    }

    function writeOut(path, value) {
      write(path, value)
      localObj[cleanPath(path)] = value
    }

    parseObj(newUserObj, parentPath)

    return localObj
  }

  function removeMissingKeys(newStorageObj, oldStorageObj) {
    const oldPaths = Object.keys(oldStorageObj || {})

    oldPaths.forEach(path => {
      if (typeof newStorageObj[cleanPath(path)] === "undefined") {
        removePath(path)
      }
    })
  }

  function getCurrentStorageObject(path) {
    const obj = {}

    function parse(path) {
      const data = get(path)

      obj[path] = data

      if (data && data.children) {
        Object.keys(data.children).forEach(child => {
          parse(`${path}/${child}`)
        })
      }
    }

    parse(path)

    return obj
  }

  function write(path, value) {
    const clean = cleanPath(path)

    if (value === null) {
      removePath(clean)
    } else {
      storage.set(clean, value)
    }
  }

  function get(path) {
    const clean = cleanPath(path)
    return storage.get(clean)
  }

  this.write = writeToStore
}

function Getter(storage, extractStoredValue) {
  function get(path) {
    function parse(path) {
      const data = storage.get(cleanPath(path))

      if (data && data.children) {
        const obj = {}

        Object.keys(data.children).forEach(child => {
          const value = parse(`${path}/${child}`)
          if (typeof value !== "undefined" && !isEmptyObject(value)) {
            obj[child] = value
          }
        })
        return obj
      }
      return extractStoredValue(data)
    }

    const res = parse(path)
    return isEmptyObject(res) ? null : res
  }

  this.get = get
}

function cleanPath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .join("/")
}

function UserEvents(getDataForPath) {
  const handlers = { child_added: {}, child_removed: {}, value: {} }

  function addHandlerForPath(path, type, handler, queryOpts) {
    const clean = cleanPath(path)
    const handlersForType = handlers[type]

    const pathHandlers = handlersForType[clean] || {}
    const handlerId = Util.guid()
    pathHandlers[handlerId] = { handler, queryOpts }
    handlersForType[clean] = pathHandlers

    // we don't want to fire in this event loop, otherwise we won't be able to
    // call off on this handler during the callback.
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) {
        return
      }

      pathHandlers[handlerId].firstFire = true
      // since we defer by one event loop it's possible that in between we've actually fired
      // a change event, let's make sure we don't fire twice with the same data

      if (type === "value") {
        var currentData = getDataForPath(clean)
        handler(currentData, clean)
      } else if (type === "child_added") {
        var currentData = getDataForPath(clean) || {}

        if (typeof currentData === "object") {
          let keys = Object.keys(currentData)

          if (queryOpts && queryOpts.limitToLast) {
            keys = keys.slice(keys.length - queryOpts.limitToLast, keys.length)
          }

          keys.forEach(key => {
            const fullPath = `${clean}/${key}`
            const childData = currentData[key]

            handler(childData, fullPath)
          })
        }
      }
    })

    return function() {
      cancelled = true
      delete pathHandlers[handlerId]
    }
  }

  function getHandlers(type, path) {
    const clean = cleanPath(path)
    return Util.objectValues(handlers[type][clean] || {})
  }

  this.handlers = getHandlers
  this.addHandler = addHandlerForPath
}

function EventProcessor(getDataForPath, userEvents, extractStoredValue) {
  function respondToChange(changes, _opts) {
    const opts = _opts || {}

    const allPathsToFire = {}

    changes.forEach(change => {
      const oldData = change.oldData
      const newData = change.newData
      const path = change.key

      const addedAndRemovedChildren = parseAddedAndRemovedChildren(
        oldData,
        newData
      )
      const addedChildren = addedAndRemovedChildren.added
      const removedChildren = addedAndRemovedChildren.removed

      const oldValue = extractStoredValue(oldData)
      const newValue = extractStoredValue(newData)

      if (newValue !== oldValue || opts.forceChangeEvent) {
        const components = path.split("/").filter(Boolean)

        const builtPathList = []

        components.forEach(component => {
          builtPathList.push(component)
          allPathsToFire[builtPathList.join("/")] = 1
        })
      }

      addedChildren.length && fireChildAddedHandlers(path, addedChildren, opts)
      removedChildren.length &&
        fireChildRemovedHandlers(path, removedChildren, opts)
    })

    Object.keys(allPathsToFire).forEach(pathToFire => {
      const handlerList = userEvents.handlers("value", pathToFire) || []
      handlerList.forEach(fire)

      function fire(handlerAndQueryOpts) {
        const value = getDataForPath(pathToFire)
        if (handlerAndQueryOpts.firstFire) {
          handlerAndQueryOpts.handler(value, pathToFire, opts)
        }
      }
    })
  }

  function fireChildRemovedHandlers(path, removedChildren, opts) {
    const handlerList = userEvents.handlers("child_removed", path) || []

    handlerList.forEach(handlerAndQueryOpts => {
      removedChildren.forEach(child => {
        // the actual firebase spec is to return the latest verson of the
        // child that was removed. However, we don't ever need that,
        // and doing it right would be prett complex.

        // make when the hander has been fired the first time by a change because
        // otherwise we can call handlers twice when binding and adding children in the
        // same event loop.

        if (handlerAndQueryOpts.firstFire) {
          handlerAndQueryOpts.handler({}, `${path}/${child}`, opts)
        }
      })
    })
  }

  function fireChildAddedHandlers(path, addedChildren, opts) {
    const handlerList = userEvents.handlers("child_added", path) || []

    handlerList.forEach(handlerAndQueryOpts => {
      addedChildren.forEach(child => {
        if (handlerAndQueryOpts.firstFire) {
          handlerAndQueryOpts.handler(
            getDataForPath(`${path}/${child}`),
            `${path}/${child}`,
            opts
          )
        }
      })
    })
  }

  this.respondToChange = respondToChange
}

function Store(storage, seedData) {
  // to mimic wilddog and firebase we want to
  // convert any undefined values to null
  function convertUndefinedToNull(storedValue) {
    if (
      !storedValue ||
      typeof storedValue.value === "undefined" ||
      isEmptyObject(storedValue.value)
    ) {
      return null
    }
    return storedValue && storedValue.value
  }

  const getter = new Getter(storage, convertUndefinedToNull)
  const writer = new Writer(storage)
  const userEvents = new UserEvents(getter.get)
  const eventProcessor = new EventProcessor(
    getter.get,
    userEvents,
    convertUndefinedToNull
  )
  storage.registerChangeListener(eventProcessor.respondToChange)

  writer.write("", seedData)

  this.get = getter.get
  this.set = writer.write
  this.addHandler = userEvents.addHandler
}

module.exports = Store
