const React = require("react")
const WithData = require("./WithData")

const DataImage = WithData(({ src }) => <img src={src} />)

module.exports = DataImage
