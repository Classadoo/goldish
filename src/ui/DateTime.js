const moment = require("moment")
const React = require("react")
const WithData = require("./WithData")

const DataDateTime = WithData(({ date }) => (
  <span>{moment(date).format("M/D, h:mm:ss A")}</span>
))

module.exports = DataDateTime
