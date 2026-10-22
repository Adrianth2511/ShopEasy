const appJson = require('./app.json');
const fs = require('fs');
const path = require('path');

const localEnv = fs.existsSync(path.join(__dirname, '.env'))
  ? Object.fromEntries(
    fs
      .readFileSync(path.join(__dirname, '.env'), 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      })
  )
  : {};

const cleverTapAccountId =
  process.env.CLEVERTAP_ACCOUNT_ID || localEnv.CLEVERTAP_ACCOUNT_ID;
const cleverTapAccountToken =
  process.env.CLEVERTAP_ACCOUNT_TOKEN || localEnv.CLEVERTAP_ACCOUNT_TOKEN;
const isEasBuild = process.env.EAS_BUILD === '1' || process.env.EAS_BUILD === 'true';

if ((!cleverTapAccountId || !cleverTapAccountToken) && isEasBuild) {
  throw new Error(
    'CLEVERTAP_ACCOUNT_ID and CLEVERTAP_ACCOUNT_TOKEN are required for an EAS build. ' +
    'Add them with eas env:set.'
  );
}

if (!cleverTapAccountId || !cleverTapAccountToken) {
  console.warn(
    'CleverTap credentials are not available while Expo is inspecting the project. ' +
    'Set CLEVERTAP_ACCOUNT_ID and CLEVERTAP_ACCOUNT_TOKEN before prebuilding or building.'
  );
}

module.exports = ({ config }) => ({
  ...appJson.expo,
  ...config,
  plugins: [
    ...(config.plugins || []),
    [
      '@clevertap/clevertap-expo-plugin',
      {
        accountId: cleverTapAccountId || 'ACCOUNT_ID_REQUIRED',
        accountToken: cleverTapAccountToken || 'ACCOUNT_TOKEN_REQUIRED',
        logLevel: 3,
        android: {
          features: {
            enablePush: true,
            enableInApp: true,
            enableInbox: true,
          },
          registerActivityLifecycleCallbacks: true,
        },
        ios: {
          mode: 'production',
        },
      },
    ],
    './plugins/withCleverTapAndroid',
  ],
});
