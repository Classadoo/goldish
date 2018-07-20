const path = require("path")

const config = [
  {
    name: "brackish",
    entry: {
      brackish: ["./brackish.js"]
    },
    output: {
      path: path.resolve("../dist/core"),
      filename: "[name].js",
      libraryTarget: "umd",
      library: "brackish"
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
    name: "brackish-ui",
    entry: {
      "brackish-ui": ["./brackish-ui.js"]
    },
    output: {
      path: path.resolve("../dist/ui"),
      filename: "[name].js",
      libraryTarget: "umd",
      library: "brackish-ui"
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
