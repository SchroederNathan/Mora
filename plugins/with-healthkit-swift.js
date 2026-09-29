const { withPodfile } = require('expo/config-plugins')

// HealthKit 16's core imports a private Clang module. Xcode 27's explicit Swift
// dependency scanner also needs that module's search path on the consumer pod.
module.exports = function withHealthkitSwift(config) {
  return withPodfile(config, (config) => {
    const marker = '# Mora HealthKit 16 / Xcode 27 module search path'
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents = config.modResults.contents.replace(
        'post_install do |installer|',
        `post_install do |installer|
    ${marker}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'ReactNativeHealthkit'
      target.build_configurations.each do |build_config|
        build_config.build_settings['SWIFT_INCLUDE_PATHS'] = '$(inherited) $(PODS_ROOT)/../../node_modules/@react-native-healthkit/core/ios'
      end
    end`,
      )
    }
    return config
  })
}
