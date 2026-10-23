import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * The URL that launched the app, read from the OS at most once per process
 * and shared by every caller (the invite capture and the auth-callback
 * watcher). Remounting the root, as a dev-client return-to-activity can, reuses
 * the same answer instead of asking again.
 *
 * Android's IntentModule parks getInitialURL() calls made while no activity is
 * attached and answers them on resume; a call that still finds no activity at
 * that point is re-parked mid-loop, which throws a
 * ConcurrentModificationException. expo-router makes its own call while it
 * resolves the first route, so this one waits until the app is active (an
 * activity is attached and the call is answered at once) and never joins that
 * queue.
 */
let launchUrl: Promise<string | null> | null = null;

export function getLaunchUrl(): Promise<string | null> {
  launchUrl ??= whenActive()
    .then(() => Linking.getInitialURL())
    .catch(() => null);
  return launchUrl;
}

function whenActive(): Promise<void> {
  if (Platform.OS !== 'android' || !AppState.isAvailable || AppState.currentState === 'active') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      subscription.remove();
      resolve();
    });
  });
}
