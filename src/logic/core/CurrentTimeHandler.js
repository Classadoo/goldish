function CurrentTimehandler(frequency = 100) {
  function on (callback) {
    const callbackInterval = setInterval(() => {
      callback(Date.now())
    }, frequency)

    return () => {
      clearInterval(callbackInterval)
    }
  }

  this.on = on
  this.name = 'currentTime'
}

module.exports = CurrentTimehandler
