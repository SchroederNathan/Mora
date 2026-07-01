const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

let config = getDefaultConfig(__dirname);

// Watch the react-native-worklets Bundle Mode output directory
config.watchFolders.push(
  require('path').resolve(
    __dirname,
    'node_modules/react-native-worklets/.worklets'
  )
);

// Apply the official Bundle Mode Metro setup (resolver + .worklets module-id
// factory + inlineRequires). This replaces the previous hand-rolled resolver,
// which crashed `expo export` (`defaultResolver is not a function`) and was
// missing the module-id factory needed to bundle the generated .worklets files.
config = getBundleModeMetroConfig(config);

module.exports = config;
