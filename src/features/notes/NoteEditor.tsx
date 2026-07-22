import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Users } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { spacing, useTheme } from '@/theme';
import { noteSchema, type NoteForm } from '@/lib/validation/schemas';
import { confirmDestructive } from '@/lib/confirm';
import type { TripNote } from '@/lib/types';
import { useDeleteNote, useSaveNote } from './hooks';

interface NoteEditorProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  /** null = new note; private is the default (NOTE-1). */
  note: TripNote | null;
}

function defaultsFor(note: TripNote | null): NoteForm {
  return {
    body: note?.body ?? '',
    isPrivate: note?.isPrivate ?? true,
  };
}

export function NoteEditor({ visible, onClose, tripId, note }: NoteEditorProps) {
  const { colors } = useTheme();
  const save = useSaveNote(tripId);
  const remove = useDeleteNote(tripId);

  const { control, handleSubmit, reset } = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: defaultsFor(note),
  });

  useEffect(() => {
    if (visible) reset(defaultsFor(note));
  }, [visible, note, reset]);

  const onSave = handleSubmit(async (form) => {
    await save.mutateAsync({ noteId: note?.id ?? null, input: form });
    onClose();
  });

  const onDelete = async () => {
    if (!note) return;
    const confirmed = await confirmDestructive(
      'Delete this note?',
      note.isPrivate
        ? 'This private note is gone for good.'
        : 'It disappears for everyone on the trip.',
      'Delete',
    );
    if (!confirmed) return;
    await remove.mutateAsync(note.id);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title={note ? 'Edit note' : 'New note'}
      onClose={onClose}
      actionLabel="Save"
      onAction={onSave}
      actionDisabled={save.isPending}
    >
      <Controller
        control={control}
        name="isPrivate"
        render={({ field }) => (
          <Card padded style={styles.privacyCard}>
            <View style={styles.privacyRow}>
              <View style={styles.privacyTitleRow}>
                {field.value ? (
                  <Lock size={17} color={colors.accent.ink} strokeWidth={1.6} />
                ) : (
                  <Users size={17} color={colors.text.muted} strokeWidth={1.6} />
                )}
                <View style={styles.privacyCopy}>
                  <AppText role="bodyStrong" style={styles.privacyTitle}>
                    {field.value ? 'Only you can see this' : 'Shared with the trip'}
                  </AppText>
                  <AppText role="caption" tone="muted" style={styles.privacyCaption}>
                    {field.value
                      ? 'Not even trip members. Turn off to share.'
                      : 'Every member of this trip can read it.'}
                  </AppText>
                </View>
              </View>
              <Toggle
                value={field.value}
                onValueChange={async (nextPrivate) => {
                  if (!nextPrivate) {
                    const confirmed = await confirmDestructive(
                      'Share this note?',
                      'Share this note with everyone on the trip?',
                      'Share',
                    );
                    if (!confirmed) return;
                  }
                  field.onChange(nextPrivate);
                }}
                accessibilityLabel="Only you can see this"
              />
            </View>
          </Card>
        )}
      />
      <Controller
        control={control}
        name="body"
        render={({ field, fieldState }) => (
          <TextField
            label="Note"
            multiline
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoFocus={!note}
            placeholder="Anything worth remembering"
          />
        )}
      />
      {note ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete note"
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <AppText role="label" tone="danger">
            Delete note
          </AppText>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  privacyCard: {
    paddingVertical: spacing.s3 + 1,
    paddingHorizontal: spacing.s3 + 2,
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.s3,
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s2 + 1,
    flexShrink: 1,
  },
  privacyCopy: {
    flexShrink: 1,
  },
  privacyTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  privacyCaption: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.s2,
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
