const Util = require("../../common/Util.js")
const MultiListener = require("./MultiListener")

function FakePromise(val) {
  this.then = function(resolve) {
    const returnVal = resolve(val)
    if (returnVal && returnVal.then) {
      return returnVal
    }
    return new FakePromise(returnVal)
  }

  this.catch = _ => _
}

function RefBuilders(baseRefBuilder, pathMap) {
  function parameterized(pathString) {
    return function() {
      const parameters = [].slice.call(arguments)

      const pathDescriptor = pathString

      const pathPieces = pathString.match(/(<[^<>]+>)/g) || []

      if (parameters.length !== pathPieces.length) {
        console.error(
          `wrong number of parameters for datahandler: ${pathDescriptor}`,
          parameters
        )
        throw new Error(
          `wrong number of parameters for datahandler: ${pathDescriptor}`,
          parameters
        )
      }

      let nullParam = false
      parameters.forEach((param, i) => {
        const paramDescriptor = pathPieces[i]
        const paramTypeMatch = paramDescriptor.match(/:([a-z]+)/)
        const paramType = paramTypeMatch && paramTypeMatch[1]

        if (param === null) {
          nullParam = true
        }

        const allChecks =
          typeof param === "boolean" ||
          typeof param === "string" ||
          typeof param === "number"
        let check = allChecks
        if (paramType === "uid") {
          check = typeof param === "string" && param[0] === "-"
        } else if (paramType) {
          check = typeof param === paramType
        }

        if (!check && param !== null) {
          const message = `invalid param, ${JSON.stringify(
            param
          )} for param ${paramDescriptor}, while building ref ${pathDescriptor}. All params are: ${parameters}`
          console.warn(message)
          throw new ReferenceError(message)
        }
      })

      if (nullParam) {
        throw new TypeError(
          `null param for path ${pathDescriptor}. All params are: ${parameters}`
        )
      }

      let pathDescriptorCopy = pathDescriptor.slice(0, pathDescriptor.length)

      pathPieces.forEach((pathPiece, i) => {
        if (parameters[i] !== undefined) {
          pathDescriptorCopy = pathDescriptorCopy.replace(
            pathPiece,
            parameters[i]
          )
        }
      })

      return pathDescriptorCopy
    }
  }

  // Ref Getter provides methods to listen to a ref which can be made up
  // of both static and dynamic components.
  function RefGetter(staticArgList, dynamicArgs, refPathFun, queryOpts, debug) {
    this.staticArgList = staticArgList
    this.dynamicArgs = dynamicArgs
    this.refPathFun = refPathFun

    const dynamicIndexes = Object.keys(dynamicArgs)

    const opts = queryOpts || {}
    this.opts = opts

    const compositeHandlers = dynamicIndexes.map(index => dynamicArgs[index])
    this.compositeHandlers = compositeHandlers

    this.identifier = `#${JSON.stringify(staticArgList)}~${JSON.stringify(
      opts
    )}#`

    function on(callback) {
      // if we have only static args we should still wait for one cycle to return
      // the ref, to make sure the off function get's returned before on(callback)
      // is called. However, we also need the off function to be able to cancel the
      //  the callback.
      let pendingDataChange = Promise.resolve()
      let callbackCancelled
      const finalArgList = staticArgList.slice()
      let offArgListener
      if (dynamicIndexes.length) {
        const dynamicArgMap = {}
        dynamicIndexes.forEach(argIndex => {
          const handler = dynamicArgs[argIndex]
          dynamicArgMap[argIndex] = handler
        })

        const dynamicArgListener = new MultiListener(dynamicArgMap, null, debug)
        offArgListener = dynamicArgListener.off
        dynamicArgListener.on((res, _, trigger, compositePaths) => {
          const compositeValues = []
          Object.keys(res).forEach(index => {
            finalArgList[index] = res[index]
            compositeValues[index] = res[index]
          })

          const cachedArgList = finalArgList.slice()

          pendingDataChange = pendingDataChange.then(() =>
            returnRef(cachedArgList, trigger, compositeValues, compositePaths)
          )
        })
      } else {
        // we do this to make sure this function returns before we execute the callback
        Promise.resolve().then(_ => returnRef(finalArgList))
      }

      function returnRef(
        argList,
        triggerPath,
        compositeValues,
        compositePaths
      ) {
        try {
          var path = refPathFun.apply(this, argList)
        } catch (e) {
          return callback(e, triggerPath, null, compositePaths)
        }

        return buildRefWithOpts(baseRefBuilder(path)).then(ref => {
          if (!callbackCancelled) {
            callback(ref, triggerPath, compositeValues, compositePaths || [])
          }
        })
      }

      return function() {
        callbackCancelled = true
        offArgListener && offArgListener()
      }
    }

    function once() {
      let refReady
      const finalArgList = staticArgList.slice()
      const compositeValues = []

      if (dynamicIndexes.length) {
        const resolvedDynamicIndexes = dynamicIndexes.map(argIndex => {
          const handler = dynamicArgs[argIndex]

          return handler.once().then((data, name) => {
            finalArgList[argIndex] = data
            compositeValues[argIndex] = data
          })
        })
        refReady = Promise.all(resolvedDynamicIndexes)
      } else {
        refReady = new FakePromise()
      }

      return refReady.then(function() {
        try {
          const path = refPathFun.apply(this, finalArgList)
          return buildRefWithOpts(baseRefBuilder(path)).then(ref => ({
            ref,
            compositeValues
          }))
        } catch (e) {
          return { ref: e }
        }
      })
    }

    function buildRefWithOpts(refPromise) {
      return refPromise.then(ref =>
        Object.keys(opts).reduce((ref, optName) => {
          const optArgs = opts[optName]
          if (!ref[optName]) {
            throw Error("invalid query opt for this store: ", optName)
          } else if (optArgs) {
            return ref[optName](...optArgs)
          }
        }, ref)
      )
    }

    // only should be used by in mem refs when getting sync data in very special cases.
    function syncRef() {
      const path = refPathFun.apply(this, staticArgList)
      return baseRefBuilder._sync(path)
    }

    this.on = on
    this.once = once
    this._syncRef = syncRef
  }

  RefGetter.prototype.buildNewWithQuery = function(queryName, queryArgs) {
    const optsUpdate = {}
    optsUpdate[queryName] = queryArgs
    const newOpts = Util.extend(this.opts, optsUpdate)
    return new RefGetter(
      this.staticArgList,
      this.dynamicArgs,
      this.refPathFun,
      newOpts
    )
  }

  function buildRefsFromObject(nestedPathMap) {
    const refBuilders = {}
    Object.keys(nestedPathMap).forEach(name => {
      const possiblePathList = nestedPathMap[name]

      if (typeof possiblePathList === "string") {
        refBuilders[name] = buildRefGetter(parameterized(possiblePathList))
      } else {
        refBuilders[name] = buildRefsFromObject(possiblePathList)
      }
    })

    return refBuilders
  }

  function buildRefGetter(refPathFun, debug) {
    return function() {
      const args = [].slice.call(arguments)

      const dynamicArgs = {}
      args.forEach((arg, i) => {
        if (arg && arg.on) {
          dynamicArgs[i] = arg
        }
      })

      return new RefGetter(args, dynamicArgs, refPathFun, null, debug)
    }
  }

  return buildRefsFromObject(pathMap)
}

module.exports = RefBuilders
