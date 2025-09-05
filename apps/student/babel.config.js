module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-runtime', {
        helpers: false,
        regenerator: true,
        corejs: false,
        useESModules: false,
        absoluteRuntime: false,
        version: '^7.25.2'
      }]
    ],
  };
};