import { describe, expect, it } from 'vitest';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { mutationKeys, queuedMutationName } from '../keys';
import {
  isMemoryOnlyMutation,
  isPersistKey,
  persistKey,
  redactPersistedClient,
  shouldPersistMutation,
  shouldPersistQuery,
} from '../persist';

describe('per-account keys', () => {
  it('stores each account under its own key', () => {
    expect(persistKey('user-a')).not.toBe(persistKey('user-b'));
    expect(persistKey('user-a')).toContain('user-a');
  });

  it('recognises any account’s stored cache, and nothing else', () => {
    expect(isPersistKey(persistKey('user-a'))).toBe(true);
    expect(isPersistKey('waymark.reminders.v2.user-a')).toBe(false);
    expect(isPersistKey('waymark.remindersEnabled')).toBe(false);
  });
});

describe('queuedMutationName', () => {
  it('names every queued write', () => {
    for (const [name, key] of Object.entries(mutationKeys)) expect(queuedMutationName(key)).toBe(name);
  });

  it('leaves online-only and unkeyed writes out', () => {
    expect(queuedMutationName(undefined)).toBeNull();
    expect(queuedMutationName(['trips', 'delete'])).toBeNull();
    expect(queuedMutationName(['trips'])).toBeNull();
    expect(queuedMutationName(['notes', 'save', 'extra'])).toBeNull();
  });
});

const query = (key: unknown[], status = 'success') => ({ queryKey: key, state: { status } });

describe('shouldPersistQuery', () => {
  it('keeps the trip list and the trip screens', () => {
    for (const key of [['trips'], ['trip', 't1'], ['trip', 't1', 'members'], ['profile', 'me', 'u1'], ['itinerary', 't1'], ['notes', 't1'], ['packing', 't1']]) {
      expect(shouldPersistQuery(query(key))).toBe(true);
    }
  });

  it('never keeps invites, invite previews or signed image URLs', () => {
    expect(shouldPersistQuery(query(['invite', 't1', 'u1']))).toBe(false);
    expect(shouldPersistQuery(query(['invite-preview', 'ABCD1234']))).toBe(false);
    expect(shouldPersistQuery(query(['signed-url', 'avatars', 'u1/a.jpg']))).toBe(false);
  });

  it('keeps only data that loaded', () => {
    expect(shouldPersistQuery(query(['trips'], 'pending'))).toBe(false);
    expect(shouldPersistQuery(query(['trips'], 'error'))).toBe(false);
  });
});

const mutation = (key: readonly unknown[] | undefined, variables: unknown, isPaused = true) => ({
  options: { mutationKey: key },
  state: { isPaused, variables },
});

describe('shouldPersistMutation', () => {
  it('keeps queued stop, note, packing and trip writes', () => {
    expect(shouldPersistMutation(mutation(mutationKeys.saveStop, { tripId: 't', itemId: null, input: { title: 'Louvre' } }))).toBe(true);
    expect(shouldPersistMutation(mutation(mutationKeys.setPacked, { tripId: 't', itemId: 'p', isPacked: true }))).toBe(true);
    expect(shouldPersistMutation(mutation(mutationKeys.updateTrip, { tripId: 't', name: 'Paris' }))).toBe(true);
    expect(shouldPersistMutation(mutation(mutationKeys.saveNote, { tripId: 't', noteId: null, input: { body: 'Hi', isPrivate: false } }))).toBe(true);
    expect(shouldPersistMutation(mutation(mutationKeys.deleteNote, { tripId: 't', noteId: 'n' }))).toBe(true);
  });

  it('keeps only writes that are waiting, not ones on their way (a replay could duplicate them)', () => {
    expect(shouldPersistMutation(mutation(mutationKeys.saveStop, { tripId: 't' }, false))).toBe(false);
  });

  it('never stores a queued private note', () => {
    const privateNote = mutation(mutationKeys.saveNote, { tripId: 't', noteId: 'n', input: { body: 'secret', isPrivate: true } });
    expect(isMemoryOnlyMutation(privateNote)).toBe(true);
    expect(shouldPersistMutation(privateNote)).toBe(false);
    // Unknown privacy counts as private.
    expect(shouldPersistMutation(mutation(mutationKeys.saveNote, { tripId: 't', noteId: null, input: { body: 'x' } }))).toBe(false);
  });

  it('keeps a trip with a picked photo in memory only', () => {
    expect(shouldPersistMutation(mutation(mutationKeys.createTrip, { name: 'Paris', coverImage: { uri: 'file:///tmp/a.jpg' } }))).toBe(false);
    expect(shouldPersistMutation(mutation(mutationKeys.createTrip, { name: 'Paris', coverImage: null }))).toBe(true);
  });

  it('leaves online-only writes out', () => {
    expect(shouldPersistMutation(mutation(['trips', 'delete'], 't'))).toBe(false);
    expect(shouldPersistMutation(mutation(undefined, {}))).toBe(false);
  });
});

describe('redactPersistedClient', () => {
  const note = (id: string, isPrivate: boolean) => ({ id, body: `body ${id}`, isPrivate });
  const client = (): PersistedClient =>
    ({
      timestamp: 1,
      buster: '1',
      clientState: {
        queries: [
          { queryKey: ['notes', 't1'], queryHash: 'n', state: { data: [note('shared', false), note('private', true)] } },
          { queryKey: ['trips'], queryHash: 't', state: { data: [{ id: 't1', name: 'Paris' }] } },
        ],
        mutations: [
          { mutationKey: mutationKeys.saveNote, state: { isPaused: true, variables: { input: { body: 'secret', isPrivate: true } } } },
          { mutationKey: mutationKeys.saveStop, state: { isPaused: true, variables: { input: { title: 'Louvre' } } } },
        ],
      },
    }) as unknown as PersistedClient;

  it('stores no private note body', () => {
    const stored = JSON.stringify(redactPersistedClient(client()));
    expect(stored).not.toContain('body private');
    expect(stored).not.toContain('secret');
    expect(stored).toContain('body shared');
  });

  it('keeps everything else as it was', () => {
    const redacted = redactPersistedClient(client());
    expect(redacted.clientState.queries[1]).toEqual(client().clientState.queries[1]);
    expect(redacted.clientState.mutations.map((m) => m.mutationKey)).toEqual([mutationKeys.saveStop]);
    expect(redacted.timestamp).toBe(1);
  });
});
