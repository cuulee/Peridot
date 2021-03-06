const path = require('path')
const webpack = require('webpack')
const glob = require('glob-all')
const utils = require('./utils')
const config = require('../config/oracle')

const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const StyleLintPlugin = require('stylelint-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const HTMLPlugin = require('html-webpack-plugin')
const OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const PurifyCSSPlugin = require('purifycss-webpack')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

// https://github.com/kangax/html-minifier#options-quick-reference
const minifyOptions = {
  collapseWhitespace: true,
  removeComments: config.showComments === false,
  ignoreCustomComments: [/vue-ssr-outlet/],
  removeAttributeQuotes: true,
  removeEmptyAttributes: true
}

const vueLoaderConfig = {
  extractCSS: config.isProd,
  loaders: utils.cssLoaders({
    sourceMap: config.productionSourceMap,
    extract: config.isProd
  }),
  postcss: [
    require('autoprefixer')({
      browsers: ['last 3 versions']
    })
  ],
  transformToRequire: {
    video: 'src',
    source: 'src',
    img: 'src',
    image: 'xlink:href'
  },
  preserveWhitespace: false
}

let sharedPlugins = [
  new StyleLintPlugin({
    files: ['src/**/*.scss'], // add vue files once stylelint works correctly only for style tags
    syntax: 'scss'
  }),

  // enable scope hoisting
  new webpack.optimize.ModuleConcatenationPlugin(),

  // keep module.id stable when vender modules does not change
  new webpack.HashedModuleIdsPlugin(),
]

let devPlugins = [
  new FriendlyErrorsPlugin()
]

let prodPlugins = [
  new UglifyJsPlugin({
    uglifyOptions: {
      ie8: false,
      ecma: 6,
      output: {
        comments: config.showComments,
        beautify: false
      },
      warnings: config.warningsAndErrors
    },
    parallel: true,
    cache: true
  }),

  // extract css into its own file
  new ExtractTextPlugin({
    filename: utils.assetsPath('css/[name].[contenthash].css'),
    allChunks: true
  }),

  // https://github.com/webpack-contrib/purifycss-webpack
  new PurifyCSSPlugin({
    paths: glob.sync([
      resolve('src/*.vue'),
      resolve('src/components/*.vue'),
      resolve('src/views/*.vue')
    ]),
    purifyOptions: {
      // whitelist css that is activated by js and not on initial page load
      whitelist: [
        'snackbar',
        'toast',
        'is-top',
        'is-info',
        'is-success',
        'is-danger',
        'is-dark'
      ]
    }
  }),

  // Compress extracted CSS.
  new OptimizeCSSPlugin({
    cssProcessorOptions: {
      safe: true,
      discardComments: { removeAll: config.showComments === false }
    }
  }),

  new HTMLPlugin({
    filename: resolve('dist/index.html'),
    template: resolve('src/index.template.html'),
    inject: true,
    minify: minifyOptions,
    chunksSortMode: 'dependency'
  }),
  // copy custom static assets
  new CopyWebpackPlugin([
    {
      from: resolve('static'),
      to: config.assetsSubDirectory,
      ignore: ['.*']
    }
  ])
]

if (config.productionGzip) {
  const CompressionWebpackPlugin = require('compression-webpack-plugin')

  prodPlugins.push(
    new CompressionWebpackPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: new RegExp(
        '\\.(' + config.productionGzipExtensions.join('|') + ')$'
      ),
      threshold: 10240,
      minRatio: 0.8
    })
  )
}

const moduleRules = [
  {
    enforce: 'pre',
    test: /\.(vue|js)$/,
    loader: 'eslint-loader',
    exclude: /node_modules/,
    include: [resolve('src')],
    options: {
      cache: true,
      formatter: require('eslint-friendly-formatter')
    }
  },
  {
    test: /\.vue$/,
    loader: 'vue-loader',
    options: vueLoaderConfig
  },
  {
    test: /\.js$/,
    loader: 'babel-loader',
    exclude: /node_modules/
  },
  {
    test: /\.(png|jpe?g|gif|svg|ico)(\?.*)?$/,
    loader: 'url-loader',
    options: {
      limit: 10000,
      name: utils.assetsPath('img/[name].[hash:16].[ext]')
    }
  },
  {
    test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
    loader: 'url-loader',
    options: {
      limit: 10000,
      name: utils.assetsPath('media/[name].[hash:7].[ext]')
    }
  },

  {
    test: /\.(css|scss)$/,
    use: config.isProd
      ? ExtractTextPlugin.extract({
        use: 'css-loader?minimize',
        fallback: 'vue-style-loader'
      })
      : ['vue-style-loader', 'css-loader']
  },
  {
    test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
    loader: 'url-loader',
    options: {
      limit: 10000,
      name: utils.assetsPath('fonts/[name].[hash:7].[ext]')
    }
  }
]

module.exports = {
  devtool: config.isProd ? false : '#cheap-module-source-map',

  output: {
    path: resolve('dist'),
    publicPath: '/dist/',
    filename: utils.assetsPath('js/[name].[chunkhash:16].js')
  },

  /*
  target: 'node',
  node: {
    console: true,
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  */

  resolveLoader: {
    alias: {
      'scss-loader': 'sass-loader'
    }
  },

  resolve: {
    extensions: ['.js', '.vue', '.json', '.scss'],
    alias: {
      public: resolve('public'),
      '@': resolve('src'),
      '@@': path.join(__dirname, '../')
    }
  },

  module: {
    noParse: /es6-promise\.js$/, // avoid webpack shimming process
    rules: moduleRules
  },

  performance: {
    maxEntrypointSize: 300000,
    hints: config.isProd ? 'warning' : false
  },

  plugins: config.isProd
    ? sharedPlugins.concat(prodPlugins)
    : sharedPlugins.concat(devPlugins)
}
