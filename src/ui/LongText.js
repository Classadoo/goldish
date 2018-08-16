const React = require("react")
const WithData = require("./WithData")

const DataLongText = WithData(({ text }) => <div>{text}</div>)

module.exports = DataLongText
