const path = require('path')
const webpack = require('webpack')
const publicPath = '/dist/build'

module.exports = {
  entry: './index.js',
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  output: {
    path: path.join(__dirname, publicPath),
    filename: '[name].bundle.js',
    publicPath,
    sourceMapFilename: '[name].map'
  },
  devServer: {
    port: 3000,
    host: 'localhost',
    historyApiFallback: true,
    noInfo: false,
    stats: 'minimal',
    publicPath,
    contentBase: __dirname,
    hot: true
  },
  module: {
    rules: [{
      test: /\.js|.jsx?$/,
      exclude: /node_modules/,
      loaders: ['babel-loader']
    }, {
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }, {
      test: /\.(png|jpg|gif)$/,
      use: ['file-loader']
    }]
  }
}
