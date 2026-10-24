/**
 * Failures of writes that waited for the connection. The sheet that made one
 * may be closed by the time it fails (or the app restarted in between), so
 * they are reported app-wide, unless the sheet that made it is still open and
 * showed the error itself (it calls `markErrorShown`).
 */
import { useSyncExternalStore } from 'react';
import type { Mutation, QueryClient } from '@tanstack/react-query';
import { queuedMutationName } from '@/lib/query/keys';
import { isCurrentOwner } from '@/lib/query/queued';
import { queuedFailureMessage } from './messages';

export interface QueuedFailure {
  id: number;
  message: string;
}

let failures: QueuedFailure[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const shown = new WeakSet<object>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** A sheet still on screen showed this error: no app-wide report for it. */
export function markErrorShown(error: unknown): void {
  if (typeof error === 'object' && error !== null) shown.add(error);
}

function report(message: string): void {
  failures = [...failures, { id: nextId++, message }];
  emit();
}

export function dismissQueuedFailure(id: number): void {
  failures = failures.filter((failure) => failure.id !== id);
  emit();
}

/** Forgets every report, e.g. when the session ends. */
export function clearQueuedFailures(): void {
  if (failures.length === 0) return;
  failures = [];
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useQueuedFailures(): QueuedFailure[] {
  return useSyncExternalStore(subscribe, () => failures, () => failures);
}

/** Lets a sheet's own catch block run (and mark the error shown) before reporting. */
const REPORT_DELAY_MS = 50;

/**
 * Watches the mutation cache: a queued write that waited (offline, or
 * restored after a restart) and then failed is reported. Returns the
 * unsubscribe.
 */
export function watchQueuedWrites(queryClient: QueryClient): () => void {
  const waited = new WeakSet<Mutation<unknown, unknown, unknown, unknown>>();
  return queryClient.getMutationCache().subscribe((event) => {
    const { mutation } = event;
    if (!mutation) return;
    if (event.type === 'added' && mutation.state.isPaused) waited.add(mutation);
    if (event.type !== 'updated') return;
    if (event.action.type === 'pause' || (event.action.type === 'pending' && event.action.isPaused)) {
      waited.add(mutation);
    }
    if (event.action.type !== 'error' || !waited.has(mutation)) return;
    const name = queuedMutationName(mutation.options.mutationKey);
    if (!name) return;
    const { error } = event.action;
    const variables = mutation.state.variables;
    const ownerId = (variables as { ownerId?: unknown } | undefined)?.ownerId;
    // A write from a session that has ended is nobody's business now.
    if (!isCurrentOwner(ownerId)) return;
    setTimeout(() => {
      if (!isCurrentOwner(ownerId)) return;
      if (typeof error === 'object' && error !== null && shown.has(error)) return;
      report(queuedFailureMessage(name, variables, error));
    }, REPORT_DELAY_MS);
  });
}
