module.exports = {
  presets: [
    ['react-app', { runtime: 'automatic' }]
  ],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }]
  ]
};