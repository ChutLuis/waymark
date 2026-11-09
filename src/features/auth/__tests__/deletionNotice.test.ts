import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearDeletionNotice, deletionNoticeMessage, getDeletionNotice, getServerDeletionNotice,
  getNoticeGeneration, isNoticeGenerationCurrent, recordNoticeSession, startDeletionNotice,
  subscribeDeletionNotice, updateDeletionNotice } from '../deletionNotice';

afterEach(clearDeletionNotice);

describe('deletion notice', () => {
  it('keeps stable snapshots, notifies subscribers, and does not resurrect A after B clears it', () => {
    const listener = vi.fn(); const unsubscribe = subscribeDeletionNotice(listener);
    startDeletionNotice('A', 'confirmed');
    const initial = getDeletionNotice();
    expect(getDeletionNotice()).toBe(initial);
    expect(getServerDeletionNotice()).toBeNull();
    expect(deletionNoticeMessage(initial!)).toContain('account was deleted');
    updateDeletionNotice('A', true);
    expect(deletionNoticeMessage(getDeletionNotice()!)).toContain('Device cleanup');
    clearDeletionNotice();
    updateDeletionNotice('A', true);
    expect(getDeletionNotice()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it('explains absence without promising data erasure', () => {
    startDeletionNotice('A', 'absent');
    const text = deletionNoticeMessage(getDeletionNotice()!);
    expect(text).toContain('no longer available');
    expect(text).toContain('contact');
    expect(text).not.toContain('Nothing changed');
  });

  it('does not let late A cleanup change a newer B notice', () => {
    startDeletionNotice('A', 'confirmed');
    startDeletionNotice('B', 'absent');
    const b = getDeletionNotice();
    updateDeletionNotice('A', true);
    expect(getDeletionNotice()).toBe(b);
    expect(getDeletionNotice()?.ownerId).toBe('B');
  });

  it('invalidates an A deletion notice even before B is reconciled into the UI', () => {
    const initiated = getNoticeGeneration();
    recordNoticeSession();
    expect(isNoticeGenerationCurrent(initiated)).toBe(false);
    expect(isNoticeGenerationCurrent(getNoticeGeneration())).toBe(true);
  });
});
