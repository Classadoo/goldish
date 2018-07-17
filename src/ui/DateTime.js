const moment = require('moment')
const React = require('react')
const WithData = require('./WithData')

const DataDateTime = WithData(({ data }) => <span>{moment(data).format('M/D, h:mm:ss A')}</span>)

const DateTime = props => <DataDateTime dataHandlers={{data: props.handler}}></DataDateTime>

module.exports = DateTime