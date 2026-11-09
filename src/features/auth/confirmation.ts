/** Pure rules for confirmation errors and resend requests. */
export const CONFIRMATION_COOLDOWN_MS = 60_000;
export const CONFIRM_EMAIL_MESSAGE = 'Confirm your email first. Open the link we sent when you signed up.';
export const RESEND_SUCCESS_MESSAGE = 'Sent. Check your inbox.';
export const RESEND_COOLDOWN_MESSAGE = 'Please wait a minute before requesting another link.';
export const RESEND_FAILURE_MESSAGE = 'Couldn’t send the link. Check your connection and try again.';

function errorFields(error: unknown): { code?: unknown; status?: unknown } {
  return error && typeof error === 'object' ? error : {};
}

export function isEmailNotConfirmed(error: unknown): boolean {
  return errorFields(error).code === 'email_not_confirmed';
}

export function isResendRateLimit(error: unknown): boolean {
  const { code, status } = errorFields(error);
  return code === 'over_email_send_rate_limit' || status === 429;
}

export function resendFailureMessage(error: unknown): string {
  return isResendRateLimit(error) ? RESEND_COOLDOWN_MESSAGE : RESEND_FAILURE_MESSAGE;
}

export function shouldSendConfirmation(lastSentAt: number | undefined, now: number): boolean {
  return lastSentAt === undefined || now - lastSentAt >= CONFIRMATION_COOLDOWN_MS;
}
