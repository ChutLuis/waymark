import { describe, expect, it } from 'vitest';
import { INVITE_CODE_LENGTH, sanitizeInviteCode } from '../inviteCode';

describe('sanitizeInviteCode', () => {
  it('keeps all eight characters of a code copied with its space', () => {
    expect(sanitizeInviteCode('ABCD EFGH')).toBe('ABCDEFGH');
    expect(sanitizeInviteCode('abcd efgh')).toBe('ABCDEFGH');
  });

  it('drops the display dot and other separators', () => {
    expect(sanitizeInviteCode('ABCD·EFGH')).toBe('ABCDEFGH');
    expect(sanitizeInviteCode(' abcd-efgh\n')).toBe('ABCDEFGH');
  });

  it('uppercases what is typed', () => {
    expect(sanitizeInviteCode('vk4t9')).toBe('VK4T9');
  });

  it('keeps the first eight characters', () => {
    expect(sanitizeInviteCode('VK4T9QMDX')).toBe('VK4T9QMD');
    expect(sanitizeInviteCode('VK4T 9QMD 2345')).toBe('VK4T9QMD');
    expect(sanitizeInviteCode('VK4T9QMD')).toHaveLength(INVITE_CODE_LENGTH);
  });

  it('is empty when nothing is usable', () => {
    expect(sanitizeInviteCode('')).toBe('');
    expect(sanitizeInviteCode(' · - ')).toBe('');
  });

  it('reads full-width letters and digits', () => {
    expect(sanitizeInviteCode('ＶＫ４Ｔ９ＱＭＤ')).toBe('VK4T9QMD');
  });

  it('finds the code in a pasted invite message or link', () => {
    expect(sanitizeInviteCode('Join my "El Salvador" trip on Waymark! Enter invite code: VK4T 9QMD')).toBe(
      'VK4T9QMD',
    );
    expect(sanitizeInviteCode('Join my "Code BALI TRIP" trip on Waymark! Enter invite code: VK4T 9QMD')).toBe(
      'VK4T9QMD',
    );
    expect(sanitizeInviteCode('waymark://join?code=VK4T9QMD')).toBe('VK4T9QMD');
  });
});
