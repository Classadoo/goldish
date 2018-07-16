const React = require('react')
const WithData = require('./WithData')

const DataShortText = WithData(({ data }) => <span>{data}</span>)

const ShortText = props => <DataShortText dataHandlers={{data: props.handler}}></DataShortText>

module.exports = ShortText