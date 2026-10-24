/**
 * Which account queued writes belong to, and other pure checks they share
 * (queued.ts has the rest; Vitest covers these).
 */

let owner: string | null = null;

/** AuthContext points queued writes at the signed-in account before it clears the cache. */
export function setQueryOwner(userId: string | null): void {
  owner = userId;
}

export function getQueryOwner(): string | null {
  return owner;
}

/** Whether a queued write still belongs to whoever is signed in now. */
export function isCurrentOwner(ownerId: unknown): boolean {
  return typeof ownerId === 'string' && ownerId !== '' && ownerId === owner;
}

/** A queued write from a session that has ended. Never retried. */
export class StaleSessionError extends Error {
  constructor() {
    super('This change belongs to a session that has ended.');
    this.name = 'StaleSessionError';
  }
}

/** Throws unless the write's account is still the signed-in one. */
export function assertCurrentOwner(ownerId: unknown): void {
  if (!isCurrentOwner(ownerId)) throw new StaleSessionError();
}

/** Postgres's unique-violation code: an insert whose client id already landed. */
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

