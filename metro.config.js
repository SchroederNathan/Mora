const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const path = require('path')
const config = getDefaultConfig(__dirname)
config.resolver.blockList = [
  new RegExp(path.resolve(__dirname, '.context') + '/'),
  new RegExp(path.resolve(__dirname, 'dist') + '/'),
]
// The SDK's node condition wins for this package's subpath in native bundles.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@google/genai/web')
    return {
      type: 'sourceFile',
      filePath: path.resolve(
        path.dirname(require.resolve('@google/genai')),
        '../web/index.mjs',
      ),
    }
  return context.resolveRequest(context, moduleName, platform)
}
module.exports = withUniwindConfig(config, {
  cssEntryFile: './globals.css',
  dtsFile: './src/uniwind-types.d.ts',
})
