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
  },
  android: {
    package: variant.id,
    versionCode: buildNumber(VERSION, BUILD),
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
    '@react-native-community/datetimepicker',
    'expo-secure-store',
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
