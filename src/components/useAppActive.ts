import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** True while the app is in the foreground; idle loops and scenes pause otherwise. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
