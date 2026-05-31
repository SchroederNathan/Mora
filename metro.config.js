const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');
const { bundleModeMetroConfig } = require('react-native-worklets/bundleMode');

let config = getDefaultConfig(__dirname);

// Watch the .worklets/ output directory
config.watchFolders.push(
  require('path').resolve(
    __dirname,
    'node_modules/react-native-worklets/.worklets'
  )
);

// Resolve react-native-worklets/.worklets/* via the Bundle Mode resolver
const defaultResolver = config.resolver.resolveRequest;

config = mergeConfig(config, bundleModeMetroConfig);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('react-native-worklets/.worklets/')) {
    return bundleModeMetroConfig.resolver.resolveRequest(
      context,
      moduleName,
      platform
    );
  }
  return defaultResolver(context, moduleName, platform);
};

module.exports = config;
