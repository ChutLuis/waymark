import { useEffect, useState, type ReactNode } from 'react';
import { IsRestoringProvider, useQueryClient } from '@tanstack/react-query';
import { endPersistedSession, startPersistedSession } from './persistence';

/**
 * Restores the signed-in person's stored cache and queued writes, and keeps
 * storing them. Queries wait (TanStack's "restoring" state) until the restore
 * is done, so a cold start offline shows the stored trips instead of fetching
 * into the void. `waiting`: the session itself is still being restored.
 */
export function QueryPersistence({
  userId,
  waiting,
  children,
}: {
  userId: string | null;
  waiting: boolean;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  // Signing out and back in restores again.
  const [seenUser, setSeenUser] = useState(userId);
  if (seenUser !== userId) {
    setSeenUser(userId);
    setRestoredFor(null);
  }

  useEffect(() => {
    if (waiting || userId === null) return;
    let cancelled = false;
    void startPersistedSession(queryClient, userId).then(() => {
      if (!cancelled) setRestoredFor(userId);
    });
    return () => {
      cancelled = true;
      endPersistedSession();
    };
  }, [queryClient, userId, waiting]);

  const restoring = waiting || (userId !== null && restoredFor !== userId);
  return <IsRestoringProvider value={restoring}>{children}</IsRestoringProvider>;
}
