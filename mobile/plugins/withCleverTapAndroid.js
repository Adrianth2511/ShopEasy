const { withMainApplication } = require('@expo/config-plugins');

function modifyMainApplication(contents) {
  // 1. Add imports if missing
  if (!contents.includes('com.clevertap.react.CleverTapApplication')) {
    contents = contents.replace(
      'import expo.modules.ExpoReactHostFactory',
      `import expo.modules.ExpoReactHostFactory\nimport com.clevertap.react.CleverTapApplication\nimport com.clevertap.react.CleverTapPackage\nimport com.clevertap.android.sdk.CleverTapAPI`
    );
  }

  // 2. Extend CleverTapApplication instead of Application
  if (contents.includes('class MainApplication : Application()')) {
    contents = contents.replace(
      'class MainApplication : Application()',
      'class MainApplication : CleverTapApplication()'
    );
  }

  // 3. Register CleverTapPackage in packageList
  if (!contents.includes('CleverTapPackage()')) {
    contents = contents.replace(
      'PackageList(this).packages.apply {',
      'PackageList(this).packages.apply {\n          add(CleverTapPackage())'
    );
  }

  // 4. Set verbose debug level in onCreate
  if (!contents.includes('CleverTapAPI.setDebugLevel')) {
    contents = contents.replace(
      'super.onCreate()',
      `super.onCreate()\n    CleverTapAPI.setDebugLevel(CleverTapAPI.LogLevel.VERBOSE.intValue())`
    );
  }

  return contents;
}

const withCleverTapAndroid = (config) => {
  return withMainApplication(config, (config) => {
    config.modResults.contents = modifyMainApplication(config.modResults.contents);
    return config;
  });
};

module.exports = withCleverTapAndroid;
