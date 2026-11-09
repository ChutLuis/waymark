import { SUPPORT_EMAIL } from '@/lib/legal';

export type DeletionNotice = Readonly<{
  ownerId: string;
  outcome: 'confirmed' | 'absent';
  deviceWarning: boolean;
}>;

let notice: DeletionNotice | null = null;
let accountGeneration = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => { try { listener(); } catch { /* Do not disrupt auth. */ } });
}

/** Record an established session before its async UI reconciliation. */
export function recordNoticeSession(): void {
  accountGeneration += 1;
  clearDeletionNotice();
}
export function getNoticeGeneration(): number { return accountGeneration; }
export function isNoticeGenerationCurrent(generation: number): boolean { return generation === accountGeneration; }

export function startDeletionNotice(ownerId: string, outcome: DeletionNotice['outcome']): void {
  notice = { ownerId, outcome, deviceWarning: false };
  emit();
}

/** Late cleanup for an older account cannot recreate a cleared notice. */
export function updateDeletionNotice(ownerId: string, deviceWarning: boolean): void {
  if (!notice || notice.ownerId !== ownerId || notice.deviceWarning === deviceWarning) return;
  notice = { ...notice, deviceWarning };
  emit();
}

export function getDeletionNotice(): DeletionNotice | null { return notice; }
export function getServerDeletionNotice(): null { return null; }
export function subscribeDeletionNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function clearDeletionNotice(): void {
  if (!notice) return;
  notice = null;
  emit();
}

export function deletionNoticeMessage(value: DeletionNotice): string {
  const message = value.outcome === 'confirmed'
    ? 'Your account was deleted. Shared trips remain with their other members.'
    : `This account is no longer available. For confirmation that all data was removed, contact ${SUPPORT_EMAIL}.`;
  return value.deviceWarning ? `${message} Device cleanup could not be confirmed; contact support if needed.` : message;
}
