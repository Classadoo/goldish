function normalizeRef(ref) {
  if (typeof ref.key === 'function') {
    ref.key = ref.key()
  }

  if (typeof ref.ref === 'function') {
    ref.ref = ref.ref()
  }

  return ref
}

module.exports = normalizeRef
