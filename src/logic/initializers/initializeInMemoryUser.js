const CurrentUser = require('../core/CurrentUser')

const initializeInMemoryUser = userProps => {
  const baseUser = {
    displayName: 'Sim User',
    uid: '575530',
    isInMem: true,
    isAnonymous: false
  }

  const finalUserProps = Object.assign(baseUser, userProps || {})

  return new CurrentUser(
    Promise.resolve({ currentUser: finalUserProps, onAuthStateChanged: _ => _ })
  )
}

module.exports = initializeInMemoryUser
