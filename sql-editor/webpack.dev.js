const webpack = require('webpack')
const publicPath = '/dist/build'
const merge = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  devtool: 'cheap-module-source-map',
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    port: 3000,
    host: 'localhost',
    historyApiFallback: true,
    noInfo: false,
    stats: 'minimal',
    publicPath,
    contentBase: __dirname,
    hot: true
  }
})
