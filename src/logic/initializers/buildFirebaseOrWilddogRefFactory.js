const normalizeRef = require('../core/normalizeRef')

const buildFirebaseOrWilddogRefFactory = function (remote) {
  return (path) => {
    if (path === undefined || path === '') {
      const normalized = normalizeRef(remote)
      return Promise.resolve(normalized.ref)
    }
    return Promise.resolve(remote.child(path))
  }
}

module.exports = buildFirebaseOrWilddogRefFactory