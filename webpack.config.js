const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: './src-ts/index.ts',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src-ts'),
      '@models': path.resolve(__dirname, 'src-ts/models'),
      '@ui': path.resolve(__dirname, 'src-ts/ui'),
      '@api': path.resolve(__dirname, 'src-ts/api'),
      '@core': path.resolve(__dirname, 'src-ts/core'),
      '@styles': path.resolve(__dirname, 'src-ts/styles'),
      '@types': path.resolve(__dirname, 'src-ts/types'),
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'module.json', to: 'module.json' },
        { from: 'lang', to: 'lang' },
        { from: 'img', to: 'img' },
        { from: 'data', to: 'data' },
      ],
    }),
  ],
  optimization: {
    minimize: false // Keep readable for debugging during migration
  }
};
