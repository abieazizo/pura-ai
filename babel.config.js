// Babel config for Expo SDK 54 + Reanimated 4.
// Reanimated 4's plugin ships from the react-native-worklets package.
// Both plugins must be LAST in the list.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
