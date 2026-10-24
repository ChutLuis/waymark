import type { ExpoConfig } from 'expo/config';

/**
 * Public configuration only: the Supabase URL and anon key are public by
 * design (docs/ARCHITECTURE.md §10). The service-role key must never
 * appear here or anywhere in the client.
 *
 * APP_VARIANT picks the build flavour (set per profile in eas.json). Each
 * variant has its own application id, name and URL scheme, so development,
 * test and production installs live side by side on one device without
 * fighting over signatures or deep links. Unset means development, so a
 * plain `expo run:android` can never produce the store application id.
 */
type Variant = 'development' | 'test' | 'production';

const VARIANTS: Record<Variant, { id: string; name: string; scheme: string }> = {
  development: { id: 'app.waymark.dev', name: 'Waymark Dev', scheme: 'waymark-dev' },
  test: { id: 'app.waymark.test', name: 'Waymark Test', scheme: 'waymark-test' },
  production: { id: 'app.waymark', name: 'Waymark', scheme: 'waymark' },
};

const variantName = process.env.APP_VARIANT || 'development';
if (!(variantName in VARIANTS)) {
  throw new Error(`Unknown APP_VARIANT "${variantName}" (expected ${Object.keys(VARIANTS).join(', ')}).`);
}
const variant = VARIANTS[variantName as Variant];

/**
 * Versions live here (eas.json uses appVersionSource "local"). The store
 * build number is derived from the version, so bumping VERSION is enough for
 * a new release; bump BUILD (0–99) only to re-upload the same version.
 * 1.2.3 build 4 → 1020304.
 */
const VERSION = '0.1.0';
const BUILD = 0;

function buildNumber(version: string, build: number): number {
  const [major, minor, patch] = version.split('.').map(Number);
  if ([major, minor, patch].some((n) => !Number.isInteger(n) || n < 0 || n > 99) || build > 99) {
    throw new Error(`VERSION must be MAJOR.MINOR.PATCH with parts ≤ 99 and BUILD ≤ 99 (got ${version} / ${build}).`);
  }
  return major * 1_000_000 + minor * 10_000 + patch * 100 + build;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Release builds (test, production) must ship a reachable HTTPS backend:
 * cleartext is off outside development and a loopback address would point
 * at the phone itself. EAS_BUILD is set inside every EAS build (cloud and
 * --local), so this fails the build instead of shipping an app that throws
 * "Missing Supabase configuration" on launch. Values are never printed.
 */
if (process.env.EAS_BUILD === 'true' && variantName !== 'development') {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set for the ${variantName} build (EAS environment variables).`,
    );
  }
  let host: string;
  let protocol: string;
  try {
    ({ hostname: host, protocol } = new URL(supabaseUrl));
  } catch {
    throw new Error(`EXPO_PUBLIC_SUPABASE_URL is not a valid URL for the ${variantName} build.`);
  }
  if (protocol !== 'https:' || /^(localhost|127\.|10\.0\.2\.2$|0\.0\.0\.0$|\[::1\]$)/.test(host)) {
    throw new Error(`EXPO_PUBLIC_SUPABASE_URL must be a non-local https:// URL for the ${variantName} build.`);
  }
}

const config: ExpoConfig = {
  name: variant.name,
  slug: 'waymark',
  owner: 'chutluis',
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: variant.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: variant.id,
    buildNumber: String(buildNumber(VERSION, BUILD)),
    config: {
      usesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
    },
  },
  android: {
    package: variant.id,
    versionCode: buildNumber(VERSION, BUILD),
    // Permissions libraries merge in that Waymark never uses: photos come from
    // the system photo picker (no storage access), reminders are local
    // notifications (no FCM push, no launcher badges), and the session store
    // never asks for biometrics.
    // SCHEDULE_EXACT_ALARM lets "1 hr before" fire on time instead of within
    // Android's inexact window. It is user-granted (denied by default on
    // Android 14+), so the app asks for it in context (modules/exact-alarms).
    // USE_EXACT_ALARM is deliberately absent: Play reserves it for alarm-clock
    // and calendar apps.
    permissions: ['android.permission.SCHEDULE_EXACT_ALARM'],
    blockedPermissions: [
      'android.permission.USE_EXACT_ALARM',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'com.google.android.c2dm.permission.RECEIVE',
      'android.permission.READ_APP_BADGE',
      'com.sec.android.provider.badge.permission.READ',
      'com.sec.android.provider.badge.permission.WRITE',
      'com.htc.launcher.permission.READ_SETTINGS',
      'com.htc.launcher.permission.UPDATE_SHORTCUT',
      'com.sonyericsson.home.permission.BROADCAST_BADGE',
      'com.sonymobile.home.permission.PROVIDER_INSERT_BADGE',
      'com.anddoes.launcher.permission.UPDATE_COUNT',
      'com.majeur.launcher.permission.UPDATE_BADGE',
      'com.huawei.android.launcher.permission.CHANGE_BADGE',
      'com.huawei.android.launcher.permission.READ_SETTINGS',
      'com.huawei.android.launcher.permission.WRITE_SETTINGS',
      'com.oppo.launcher.permission.READ_SETTINGS',
      'com.oppo.launcher.permission.WRITE_SETTINGS',
      'me.everything.badger.permission.BADGE_COUNT_READ',
      'me.everything.badger.permission.BADGE_COUNT_WRITE',
    ],
    adaptiveIcon: {
      backgroundColor: '#E2E9EE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#E2E9EE',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: {
          backgroundColor: '#0F1729',
        },
      },
    ],
    [
      // Android's date and time dialogs in the Airmail palette instead of the
      // stock teal (values from src/theme/tokens.ts: airmailBlue, paper, ink,
      // ink2, hairline). The night variants apply with the system dark theme.
      '@react-native-community/datetimepicker',
      {
        android: {
          datePicker: {
            colorAccent: { light: '#24479A', dark: '#7E9CF0' },
            colorControlActivated: { light: '#24479A', dark: '#7E9CF0' },
            windowBackground: { light: '#FFFCF5', dark: '#1A2438' },
            textColor: { light: '#15223B', dark: '#EEF1F6' },
            textColorPrimary: { light: '#15223B', dark: '#EEF1F6' },
            textColorSecondary: { light: '#46536B', dark: '#B4BFD1' },
            // Header text over the accent band: AppCompat's white in light;
            // navy in dark, where the band is the light periwinkle.
            textColorPrimaryInverse: { light: '#FFFFFF', dark: '#15223B' },
            textColorSecondaryInverse: { light: '#B3FFFFFF', dark: '#2E3A52' },
          },
          timePicker: {
            background: { light: '#FFFCF5', dark: '#1A2438' },
            headerBackground: { light: '#24479A', dark: '#7E9CF0' },
            numbersBackgroundColor: { light: '#ECE5D7', dark: '#2B3752' },
            numbersSelectorColor: { light: '#24479A', dark: '#7E9CF0' },
            numbersTextColor: { light: '#15223B', dark: '#EEF1F6' },
          },
        },
      },
    ],
    './plugins/withTimePickerDialogTheme',
    [
      'expo-notifications',
      {
        // Status-bar icon: white on transparent (Android tints it), tinted
        // PAR AVION blue in the shade.
        icon: './assets/images/notification-icon.png',
        color: '#24479A',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Waymark uses photos you choose as a trip cover or profile picture.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-secure-store',
      {
        faceIDPermission: false,
      },
    ],
    [
      'expo-build-properties',
      {
        // Release builds: R8 minification + resource shrinking, and no
        // cleartext HTTP. The debug manifest still re-enables cleartext for
        // the development client (Metro and local Supabase over http).
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          usesCleartextTraffic: false,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl,
    supabaseAnonKey,
    eas: {
      projectId: '92b7c7a4-1fe5-481c-9805-638d2c6d62c1',
    },
  },
};

export default config;
