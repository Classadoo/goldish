function parseAddedAndRemovedChildren(oldData, newData) {
  let removedChildren = []
  if (oldData && oldData.children) {
    const newChildren = (newData && newData.children) || {}

    removedChildren = Object.keys(oldData.children).filter(oldChild => typeof newChildren[oldChild] === 'undefined')
  }

  let addedChildren = []
  if (newData && newData.children) {
    const oldChildren = (oldData && oldData.children) || {}

    addedChildren = Object.keys(newData.children).filter(newChild => typeof oldChildren[newChild] === 'undefined')
  }

  return { added: addedChildren, removed: removedChildren }
}

module.exports = parseAddedAndRemovedChildren
