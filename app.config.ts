import type { ExpoConfig } from 'expo/config';

/**
 * Public configuration only: the Supabase URL and anon key are public by
 * design (docs/ARCHITECTURE.md §10). The service-role key must never
 * appear here or anywhere in the client.
 */
const config: ExpoConfig = {
  name: 'Waymark',
  slug: 'waymark',
  owner: 'chutluis',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'waymark',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'app.waymark',
  },
  android: {
    package: 'app.waymark',
    adaptiveIcon: {
      backgroundColor: '#FAF7F1',
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
        backgroundColor: '#FAF7F1',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: {
          backgroundColor: '#1C1915',
        },
      },
    ],
    '@react-native-community/datetimepicker',
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: '92b7c7a4-1fe5-481c-9805-638d2c6d62c1',
    },
  },
};

export default config;
