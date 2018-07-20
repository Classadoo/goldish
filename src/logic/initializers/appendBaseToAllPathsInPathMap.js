function appendBaseToAllPaths(pathMap, base) {
  Object.keys(pathMap).forEach(namespaceOrPathName => {
    const value = pathMap[namespaceOrPathName]

    if (typeof value === "string") {
      pathMap[namespaceOrPathName] = `${base}/${value}`
    } else {
      Object.keys(value).forEach(pathName => {
        const pathString = value[pathName]
        value[pathName] = `${base}/${pathString}`
      })
    }
  })
}

module.exports = appendBaseToAllPaths
