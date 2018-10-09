const React = require('react')
const WithData = require('./WithData')

const DataImage = WithData(props => <img {...props} />)

module.exports = DataImage
