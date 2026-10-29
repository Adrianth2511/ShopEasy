const {
  withMainApplication,
  withMainActivity,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

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

  // 3. Register CleverTapPackage and CleverTapGeofencePackage in packageList
  if (!contents.includes('CleverTapPackage()')) {
    contents = contents.replace(
      'PackageList(this).packages.apply {',
      'PackageList(this).packages.apply {\n          add(CleverTapPackage())\n          add(CleverTapGeofencePackage())'
    );
  } else if (!contents.includes('CleverTapGeofencePackage()')) {
    contents = contents.replace(
      'add(CleverTapPackage())',
      'add(CleverTapPackage())\n          add(CleverTapGeofencePackage())'
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

function modifyMainActivity(contents) {
  // Add imports if missing
  if (!contents.includes('import android.content.Intent')) {
    contents = contents.replace(
      'import android.os.Bundle',
      'import android.os.Bundle\nimport android.content.Intent\nimport com.clevertap.android.sdk.CleverTapAPI'
    );
  }

  // Add onNewIntent for Android 12+ notification trampoline clicks
  if (!contents.includes('override fun onNewIntent')) {
    const onNewIntentSnippet = `
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      intent?.extras?.let {
        CleverTapAPI.getDefaultInstance(applicationContext)?.pushNotificationClickedEvent(it)
      }
    }
  }
`;
    const lastBraceIndex = contents.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      contents =
        contents.slice(0, lastBraceIndex) +
        onNewIntentSnippet +
        contents.slice(lastBraceIndex);
    }
  }

  return contents;
}

function modifyAndroidManifest(androidManifest) {
  // 1. Add POST_NOTIFICATIONS permission for Android 13+
  AndroidConfig.Permissions.addPermission(
    androidManifest,
    'android.permission.POST_NOTIFICATIONS'
  );

  // 2. Add Geofence & Location permissions
  const geofencePermissions = [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_BACKGROUND_LOCATION',
    'android.permission.WAKE_LOCK',
    'android.permission.RECEIVE_BOOT_COMPLETED',
  ];
  for (const perm of geofencePermissions) {
    AndroidConfig.Permissions.addPermission(androidManifest, perm);
  }

  const mainApplication =
    AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  mainApplication.service = mainApplication.service || [];

  // 3. Add default notification channel meta-data for custom sound
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(
    mainApplication,
    'CLEVERTAP_DEFAULT_CHANNEL_ID',
    'shopeasy_sound_channel'
  );

  // 4. Add FCM Message Listener Service
  const FCM_SERVICE =
    'com.clevertap.android.sdk.pushnotification.fcm.FcmMessageListenerService';
  const hasFcm = mainApplication.service.some(
    (s) => s.$ && s.$['android:name'] === FCM_SERVICE
  );
  if (!hasFcm) {
    mainApplication.service.push({
      $: {
        'android:name': FCM_SERVICE,
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'com.google.firebase.MESSAGING_EVENT',
              },
            },
          ],
        },
      ],
    });
  }

  // 5. Add CT Notification Intent Service
  const CT_INTENT_SERVICE =
    'com.clevertap.android.sdk.pushnotification.CTNotificationIntentService';
  const hasCt = mainApplication.service.some(
    (s) => s.$ && s.$['android:name'] === CT_INTENT_SERVICE
  );
  if (!hasCt) {
    mainApplication.service.push({
      $: {
        'android:name': CT_INTENT_SERVICE,
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'com.clevertap.PUSH_EVENT',
              },
            },
          ],
        },
      ],
    });
  }

  return androidManifest;
}

const withCleverTapAndroid = (config) => {
  // Chain MainApplication, MainActivity, and AndroidManifest modifications
  config = withMainApplication(config, (cfg) => {
    cfg.modResults.contents = modifyMainApplication(cfg.modResults.contents);
    return cfg;
  });

  config = withMainActivity(config, (cfg) => {
    cfg.modResults.contents = modifyMainActivity(cfg.modResults.contents);
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = modifyAndroidManifest(cfg.modResults);
    return cfg;
  });

  return config;
};

module.exports = withCleverTapAndroid;
