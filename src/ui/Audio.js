const React = require("react")
const WithData = require("./WithData")

const DataAudio = WithData(({ src, controls, autoPlay, muted }) => (
  <audio src={src} controls={controls} autoPlay={autoPlay} muted={muted} />
))

module.exports = DataAudio
