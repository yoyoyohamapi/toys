/**
 * webpack config
 * @author yoyoyohamapi
 * @ignore created 2018-08-12
 */
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/demo/index.tsx',
  output: {
		path: path.resolve(__dirname, './dist'),
		filename: 'bundle.js',
		publicPath: path.resolve(__dirname, '/')
	},
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
    '@actions': path.resolve(__dirname, './src/demo/actions'),
    '@constants': path.resolve(__dirname, './src/demo/constants'),
    '@containers': path.resolve(__dirname, './src/demo/containers'),
    "@apis": path.resolve(__dirname, './src/demo/apis')
   }
  },
  module: {
    rules: [{
			test: /\.tsx?$/,
			exclude: /^node_modules/,
			use: {
        loader: "ts-loader",
        options: {
          configFile: path.resolve(__dirname, './tsconfig.json')
        }
			}
		}, {
			test: /\.css?$/,
			loaders: ['style-loader', 'css-loader']
		}]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/demo/index.html')
		})
  ],
  devServer: {
    host: '127.0.0.1',
    port: '8888',
    historyApiFallback: true
  }
}