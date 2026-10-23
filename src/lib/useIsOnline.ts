import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

function subscribe(onChange: () => void): () => void {
  return onlineManager.subscribe(() => onChange());
}

/** Connectivity as TanStack Query sees it (fed by NetInfo in the root layout). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, () => onlineManager.isOnline(), () => true);
}
