const InMemoryAuthHandler = function (user) {
  this.changeUser = function (newUid) {
    user.uid = newUid
    authStateChangedHandlers.forEach(_ => _(user))
  }

  var authStateChangedHandlers = []
  this.onAuthStateChanged = function (handler) {
    authStateChangedHandlers.push(handler)
    const waitTillNextEventLoop = setTimeout(() => {
      handler(user)
    })

    return _ => clearTimeout(waitTillNextEventLoop)
  }

  this.signInWithCustomToken = function () {
    return Promise.resolve(user)
  }

  // no op in mem
  this.signOut = _ => _

  this.currentUser = user
}

module.exports = InMemoryAuthHandler
