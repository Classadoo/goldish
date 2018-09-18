const React = require("react")
const WithData = require("./WithData")

const DataImage = WithData(({ src, style }) => <img style={style} src={src} />)

module.exports = DataImage
