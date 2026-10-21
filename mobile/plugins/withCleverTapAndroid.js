const { withMainApplication } = require('@expo/config-plugins');

function modifyMainApplication(contents) {
  if (!contents.includes('com.clevertap.android.sdk.ActivityLifecycleCallback')) {
    contents = contents.replace(
      'import expo.modules.ExpoReactHostFactory',
      `import expo.modules.ExpoReactHostFactory\nimport com.clevertap.android.sdk.ActivityLifecycleCallback\nimport com.clevertap.android.sdk.CleverTapAPI\nimport com.clevertap.react.CleverTapRnAPI`
    );
  }

  if (!contents.includes('ActivityLifecycleCallback.register(this)')) {
    contents = contents.replace(
      'super.onCreate()',
      `CleverTapAPI.setDebugLevel(CleverTapAPI.LogLevel.VERBOSE.intValue())\n    ActivityLifecycleCallback.register(this)\n    super.onCreate()\n    CleverTapRnAPI.initReactNativeIntegration(this)`
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
