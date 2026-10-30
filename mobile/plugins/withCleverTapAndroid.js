const {
  withMainApplication,
  withMainActivity,
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function modifyMainApplication(contents) {
  // 1. Add imports if missing
  const neededImports = [
    'import com.clevertap.react.CleverTapApplication',
    'import com.clevertap.react.CleverTapPackage',
    'import com.clevertap.android.sdk.CleverTapAPI',
    'import com.clevertap.android.geofence.CTGeofenceAPI',
    'import com.clevertap.android.geofence.CTGeofenceSettings',
    'import android.app.NotificationChannel',
    'import android.app.NotificationManager',
    'import android.content.ContentResolver',
    'import android.media.AudioAttributes',
    'import android.net.Uri',
    'import android.os.Build',
  ];

  for (const imp of neededImports) {
    if (!contents.includes(imp)) {
      contents = contents.replace(
        'import expo.modules.ExpoReactHostFactory',
        `import expo.modules.ExpoReactHostFactory\n${imp}`
      );
    }
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

  // 4. Set verbose debug level & custom channel/geofence initialization in onCreate
  if (!contents.includes('createCustomNotificationChannels()')) {
    contents = contents.replace(
      'super.onCreate()',
      `super.onCreate()\n    CleverTapAPI.setDebugLevel(CleverTapAPI.LogLevel.VERBOSE.intValue())\n    createCustomNotificationChannels()\n    initCleverTapGeofence()`
    );
  }

  // 5. Append helper methods for notification channels & geofence auto-init before the last brace
  if (!contents.includes('fun createCustomNotificationChannels()')) {
    const helperMethods = `
  private fun createCustomNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        val notificationManager = getSystemService(NotificationManager::class.java)
        val soundUri = Uri.parse("\${ContentResolver.SCHEME_ANDROID_RESOURCE}://\${packageName}/raw/notification_sound")
        val audioAttributes = AudioAttributes.Builder()
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
          .build()

        val primaryChannel = NotificationChannel(
          "shopeasy_sound_channel",
          "ShopEasy Special Deals & Alerts",
          NotificationManager.IMPORTANCE_HIGH
        ).apply {
          description = "Flash sales, orders, and promotions with custom sound"
          setSound(soundUri, audioAttributes)
          enableVibration(true)
          setShowBadge(true)
        }
        notificationManager?.createNotificationChannel(primaryChannel)

        val v2Channel = NotificationChannel(
          "shopeasy_sound_channel_v2",
          "ShopEasy VIP & Order Alerts",
          NotificationManager.IMPORTANCE_HIGH
        ).apply {
          description = "Instant notifications with custom sound alert"
          setSound(soundUri, audioAttributes)
          enableVibration(true)
          setShowBadge(true)
        }
        notificationManager?.createNotificationChannel(v2Channel)

        CleverTapAPI.createNotificationChannel(
          applicationContext,
          "shopeasy_sound_channel",
          "ShopEasy Special Deals & Alerts",
          "Flash sales, orders, and promotions with custom sound",
          NotificationManager.IMPORTANCE_HIGH,
          true,
          "notification_sound.wav"
        )
        CleverTapAPI.createNotificationChannel(
          applicationContext,
          "shopeasy_sound_channel_v2",
          "ShopEasy VIP & Order Alerts",
          "Instant notifications with custom sound alert",
          NotificationManager.IMPORTANCE_HIGH,
          true,
          "notification_sound.wav"
        )
      } catch (e: Exception) {
        android.util.Log.e("MainApplication", "Error creating notification channels with sound: \${e.message}", e)
      }
    }
  }

  private fun initCleverTapGeofence() {
    try {
      val ctInstance = CleverTapAPI.getDefaultInstance(applicationContext)
      if (ctInstance != null) {
        val settings = CTGeofenceSettings.Builder()
          .enableBackgroundLocationUpdates(true)
          .setLogLevel(CleverTapAPI.LogLevel.VERBOSE.intValue())
          .setLocationAccuracy(CTGeofenceSettings.ACCURACY_HIGH)
          .setLocationFetchMode(CTGeofenceSettings.FETCH_LAST_LOCATION_PERIODIC)
          .setGeofenceMonitoringCount(50)
          .setInterval(1800000L)
          .setFastestInterval(1800000L)
          .setSmallestDisplacement(200f)
          .setGeofenceNotificationResponsiveness(0)
          .build()

        CTGeofenceAPI.getInstance(applicationContext).init(settings, ctInstance)
        android.util.Log.i("MainApplication", "CleverTap Geofence SDK initialized in MainApplication")
      }
    } catch (e: Exception) {
      android.util.Log.w("MainApplication", "CleverTap Geofence auto-init notice: \${e.message}")
    }
  }
`;
    const lastBraceIndex = contents.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      contents = contents.slice(0, lastBraceIndex) + helperMethods + contents.slice(lastBraceIndex);
    }
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

function modifyAppBuildGradle(contents) {
  if (!contents.includes('clevertap-geofence-sdk')) {
    const depsSnippet = `
    // CleverTap Geofence SDK & Location dependencies
    implementation("com.clevertap.android:clevertap-geofence-sdk:1.4.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    implementation("androidx.work:work-runtime:2.9.0")
    implementation("androidx.concurrent:concurrent-futures:1.2.0")
`;
    if (contents.includes('dependencies {')) {
      contents = contents.replace('dependencies {', `dependencies {\n${depsSnippet}`);
    }
  }
  return contents;
}

const withNativeSourceFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const targetJavaDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'adrian',
        'shopeasy'
      );
      const pluginsNativeDir = path.join(projectRoot, 'plugins', 'native');

      if (!fs.existsSync(targetJavaDir)) {
        fs.mkdirSync(targetJavaDir, { recursive: true });
      }

      // Copy Kotlin bridge files to android source folder
      const filesToCopy = ['CleverTapGeofenceModule.kt', 'CleverTapGeofencePackage.kt'];
      for (const fileName of filesToCopy) {
        const srcPath = path.join(pluginsNativeDir, fileName);
        const destPath = path.join(targetJavaDir, fileName);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[withCleverTapAndroid] Successfully copied ${fileName} to ${targetJavaDir}`);
        }
      }

      // Ensure notification_sound.wav is copied to res/raw
      const rawDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }
      const soundSrc = path.join(projectRoot, 'assets', 'notification_sound.wav');
      const soundDest = path.join(rawDir, 'notification_sound.wav');
      if (fs.existsSync(soundSrc) && !fs.existsSync(soundDest)) {
        fs.copyFileSync(soundSrc, soundDest);
        console.log(`[withCleverTapAndroid] Successfully copied notification_sound.wav to ${rawDir}`);
      }

      return cfg;
    },
  ]);
};

const withCleverTapAndroid = (config) => {
  // 1. Copy native source files & assets during prebuild
  config = withNativeSourceFiles(config);

  // 2. Modify app/build.gradle to include Geofence & Location dependencies
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = modifyAppBuildGradle(cfg.modResults.contents);
    return cfg;
  });

  // 3. Ensure Gradle properties for Push are enabled
  config = withGradleProperties(config, (cfg) => {
    const props = [
      { key: 'clevertapPushEnabled', value: 'true' },
      { key: 'clevertapPushTemplatesEnabled', value: 'true' },
      { key: 'clevertapMediaForInAppsInboxEnabled', value: 'true' },
      { key: 'clevertapInstallReferrerEnabled', value: 'true' },
      { key: 'clevertapPlayReviewEnabled', value: 'true' },
    ];
    for (const { key, value } of props) {
      const existing = cfg.modResults.find((item) => item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    }
    return cfg;
  });

  // 4. Modify MainApplication.kt
  config = withMainApplication(config, (cfg) => {
    cfg.modResults.contents = modifyMainApplication(cfg.modResults.contents);
    return cfg;
  });

  // 5. Modify MainActivity.kt
  config = withMainActivity(config, (cfg) => {
    cfg.modResults.contents = modifyMainActivity(cfg.modResults.contents);
    return cfg;
  });

  // 6. Modify AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = modifyAndroidManifest(cfg.modResults);
    return cfg;
  });

  return config;
};

module.exports = withCleverTapAndroid;
