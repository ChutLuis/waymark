/**
 * Shared Zod schemas — one per form (docs/ARCHITECTURE.md §1). Types flow
 * from these into the editors via react-hook-form's zodResolver.
 */
import { z } from 'zod';

/**
 * Text limits the database checks enforce too
 * (migrations/20261019120000_integrity_invites_deletion.sql), so a form says
 * what's wrong before a save is refused.
 */
export const LIMITS = {
  tripName: 200,
  destination: 120,
  tripDays: 366,
  stopTitle: 200,
  stopDescription: 4000,
  stopLocation: 300,
  packingLabel: 200,
  packingQuantity: 999,
  noteBody: 10000,
  displayName: 60,
} as const;

export const itineraryItemSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the item a title').max(LIMITS.stopTitle, `At most ${LIMITS.stopTitle} characters`),
    description: z.string().trim().max(LIMITS.stopDescription, `At most ${LIMITS.stopDescription} characters`),
    location: z.string().trim().max(LIMITS.stopLocation, `At most ${LIMITS.stopLocation} characters`),
    startAt: z.string().nullable(),
    endAt: z.string().nullable(),
    status: z.enum(['planned', 'confirmed', 'done']),
  })
  .refine(
    (value) =>
      !value.startAt ||
      !value.endAt ||
      new Date(value.endAt).getTime() >= new Date(value.startAt).getTime(),
    { message: 'End must be after the start', path: ['endAt'] },
  );

export type ItineraryItemForm = z.infer<typeof itineraryItemSchema>;

export const packingItemSchema = z.object({
  label: z.string().trim().min(1, 'Name the item').max(LIMITS.packingLabel, `At most ${LIMITS.packingLabel} characters`),
  quantity: z.number().int().min(1).max(LIMITS.packingQuantity, `At most ${LIMITS.packingQuantity}`),
  assignedTo: z.string().nullable(),
});

export type PackingItemForm = z.infer<typeof packingItemSchema>;

export const noteSchema = z.object({
  body: z.string().trim().min(1, 'Write something first').max(LIMITS.noteBody, `Notes can be up to ${LIMITS.noteBody} characters`),
  isPrivate: z.boolean(),
});

export type NoteForm = z.infer<typeof noteSchema>;

const emailField = z.string().trim().email('That does not look like an email address');

/** The auth server enforces the same minimum (supabase/config.toml). */
export const MIN_PASSWORD_LENGTH = 8;
/** The auth server rejects longer passwords (bcrypt reads only 72 bytes). */
export const MAX_PASSWORD_LENGTH = 72;

/** A password being chosen: sign-up and reset share one rule and its messages. */
const newPasswordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `At most ${MAX_PASSWORD_LENGTH} characters`);

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password'),
});

export type SignInForm = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: emailField,
  password: newPasswordField,
});

export type SignUpForm = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: newPasswordField,
});

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Add a name people will recognize')
    .max(LIMITS.displayName, `At most ${LIMITS.displayName} characters`),
});

export type ProfileForm = z.infer<typeof profileSchema>;

export const tripSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the trip a name').max(LIMITS.tripName, `At most ${LIMITS.tripName} characters`),
    destination: z.string().trim().max(LIMITS.destination, `At most ${LIMITS.destination} characters`),
    startDate: z.string().nullable(), // ISO date
    endDate: z.string().nullable(),
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.endDate >= value.startDate,
    { message: 'The trip cannot end before it starts', path: ['endDate'] },
  )
  .refine(
    (value) => !value.startDate || !value.endDate || daysBetween(value.startDate, value.endDate) <= LIMITS.tripDays,
    { message: 'A trip can be up to a year long', path: ['endDate'] },
  );

/** Whole days from one ISO date (YYYY-MM-DD) to another, in UTC so DST can't skew it. */
function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

export type TripForm = z.infer<typeof tripSchema>;

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, 'Codes are 8 letters and numbers'),
});

export type InviteCodeForm = z.infer<typeof inviteCodeSchema>;
