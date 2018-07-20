const path = require('path')

const config = {
  name: 'script',
  entry: {
    script: ['./script.js'],
  },
  output: {
    path: path.resolve('dist'),
    filename: '[name].js',
  },
  resolve: {
    modules: [
      'node_modules',
    ],
    extensions: ['.js', '.json'],
  },

  module: {
    loaders: [
      {
        exclude: /(node_modules)|(dist)/,
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015'],
        },
      },
    ],
  },
}

module.exports = config
