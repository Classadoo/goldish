function MockSnapshot(val, path, ref) {
  this.val = function() {
    return val
  }

  this.key = path.split('/')[path.split('/').length - 1]

  this.ref = function() {
    return ref
  }
}

module.exports = MockSnapshot
