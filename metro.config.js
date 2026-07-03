const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');
const { withUniwindConfig } = require('uniwind/metro');

// Worklets Bundle Mode emits generated modules here mid-build; the directory
// must exist before Metro starts or fresh installs (EAS) fail to watch it.
fs.mkdirSync(
  path.resolve(__dirname, 'node_modules/react-native-worklets/.worklets'),
  { recursive: true }
);

// getBundleModeMetroConfig wires the resolver + serializer for
// react-native-worklets/.worklets/* — no custom resolveRequest needed.
const config = getBundleModeMetroConfig(getDefaultConfig(__dirname));

// withUniwindConfig must stay the outermost wrapper (uniwind docs) — it
// compiles globals.css classNames; without it every className is dropped.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './globals.css',
  dtsFile: './app/uniwind-types.d.ts',
});
