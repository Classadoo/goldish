const React = require("react")
const WithData = require("./WithData")

const DataShortText = WithData(({ text }) => <span>{text}</span>)

module.exports = DataShortText
