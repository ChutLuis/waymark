import { describe, expect, it } from 'vitest';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '../schemas';

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error?.issues[0]?.message;
}

describe('new-password rule', () => {
  const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);
  const minimum = 'a'.repeat(MIN_PASSWORD_LENGTH);
  const tooLong = 'a'.repeat(MAX_PASSWORD_LENGTH + 1);

  it('is the same 8-character minimum, with the same words, on sign-up and reset', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    const signUp = signUpSchema.safeParse({ email: 'ana@example.com', password: short });
    const reset = resetPasswordSchema.safeParse({ password: short });
    expect(firstMessage(signUp)).toBe('At least 8 characters');
    expect(firstMessage(reset)).toBe('At least 8 characters');
  });

  it('accepts a password at the minimum', () => {
    expect(signUpSchema.safeParse({ email: 'ana@example.com', password: minimum }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: minimum }).success).toBe(true);
  });

  it('stops at the length the auth server accepts', () => {
    expect(firstMessage(resetPasswordSchema.safeParse({ password: tooLong }))).toBe('At most 72 characters');
    expect(resetPasswordSchema.safeParse({ password: 'a'.repeat(MAX_PASSWORD_LENGTH) }).success).toBe(true);
  });

  it('does not apply to signing in, which takes whatever the account has', () => {
    expect(signInSchema.safeParse({ email: 'ana@example.com', password: 'short' }).success).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('needs a valid email, trimmed', () => {
    const parsed = forgotPasswordSchema.safeParse({ email: '  ana@example.com ' });
    expect(parsed.success && parsed.data.email).toBe('ana@example.com');
    expect(firstMessage(forgotPasswordSchema.safeParse({ email: 'ana@' }))).toBe(
      'That does not look like an email address',
    );
  });
});
