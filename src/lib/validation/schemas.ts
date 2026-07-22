/**
 * Shared Zod schemas — one per form (docs/ARCHITECTURE.md §1). Types flow
 * from these into the editors via react-hook-form's zodResolver.
 */
import { z } from 'zod';

export const itineraryItemSchema = z
  .object({
    title: z.string().trim().min(1, 'Give the item a title'),
    description: z.string().trim(),
    location: z.string().trim(),
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
  label: z.string().trim().min(1, 'Name the item'),
  quantity: z.number().int().min(1),
  assignedTo: z.string().nullable(),
});

export type PackingItemForm = z.infer<typeof packingItemSchema>;

export const noteSchema = z.object({
  body: z.string().trim().min(1, 'Write something first'),
  isPrivate: z.boolean(),
});

export type NoteForm = z.infer<typeof noteSchema>;

const emailField = z.string().trim().email('That does not look like an email address');

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password'),
});

export type SignInForm = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'At least 8 characters'),
});

export type SignUpForm = z.infer<typeof signUpSchema>;

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Add a name people will recognize').max(60),
});

export type ProfileForm = z.infer<typeof profileSchema>;

export const tripSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the trip a name'),
    destination: z.string().trim(),
    startDate: z.string().nullable(), // ISO date
    endDate: z.string().nullable(),
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.endDate >= value.startDate,
    { message: 'The trip cannot end before it starts', path: ['endDate'] },
  );

export type TripForm = z.infer<typeof tripSchema>;

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, 'Codes are 8 letters and numbers'),
});

export type InviteCodeForm = z.infer<typeof inviteCodeSchema>;
