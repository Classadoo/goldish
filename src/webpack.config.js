const path = require('path')

const config = [{
  name: 'shovel',
  entry: {
    shovel: ['./shovel.js'],   
  },
  output: {
    path: path.resolve('../dist'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'shovel',
  },
  resolve: {
    extensions: ['.js', '.json'],
  },

  module: {
    loaders: [
      {
        exclude: /(node_modules)/,
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
        },
      },
    ],
  },
}, {
  name: 'shovel-ui',
  entry: {
    'shovel-ui': ['./shovel-ui.js'],    
  },
  output: {
    path: path.resolve('../dist'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'shovel',
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  module: {
    loaders: [
      {
        exclude: /(node_modules)/,
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015'],
        },
      },
    ],
  },
}]

module.exports = config
