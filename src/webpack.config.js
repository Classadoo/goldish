const path = require("path") 

const config = [
  {
    name: "goldish",
    entry: {
      goldish: ["./goldish.js"]
    },
    output: {
      path: path.resolve("../dist/core"),
      filename: "[name].js",
      libraryTarget: "umd",
      library: "goldish"
    },
    resolve: {
      extensions: [".js", ".json"]
    },

    module: {
      loaders: [
        {
          exclude: /(node_modules)/,
          test: /\.js$/,
          loader: "babel-loader",
          query: {
            presets: ["es2015"]
          }
        }
      ]
    }
  },
  {
    name: "goldish-ui",
    entry: {
      "goldish-ui": ["./goldish-ui.js"]
    },
    output: {
      path: path.resolve("../dist/ui"),
      filename: "[name].js",
      libraryTarget: "umd",
      library: "goldish-ui"
    },
    resolve: {
      extensions: [".js", ".json"]
    },
    module: {
      loaders: [
        {
          exclude: /(node_modules)/,
          test: /\.js$/,
          loader: "babel-loader",
          query: {
            presets: ["react", "es2015"]
          }
        }
      ]
    }
  }
]

module.exports = config
