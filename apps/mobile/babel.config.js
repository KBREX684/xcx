// Expo 默认 babel 预设；reanimated 插件必须是数组最后一项。
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
