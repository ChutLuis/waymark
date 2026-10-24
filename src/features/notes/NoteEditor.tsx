import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Users } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
import {
  EDITOR_OFFLINE_HINT,
  EDITOR_OFFLINE_QUEUED,
  OfflineNotice,
  PRIVATE_NOTE_OFFLINE_HINT,
  PRIVATE_NOTE_OFFLINE_QUEUED,
} from '@/components/OfflineNotice';
import { Sheet, type DiscardConfirm } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { disabledOpacity, hitTargetMin, spacing, useTheme } from '@/theme';
import { noteSchema, type NoteForm } from '@/lib/validation/schemas';
import { confirmDestructive } from '@/lib/confirm';
import type { TripNote } from '@/lib/types';
import { useIsOnline } from '@/lib/useIsOnline';
import { markErrorShown } from '@/features/offline/queuedErrors';
import { useDeleteNote, useSaveNote } from './hooks';

interface NoteEditorProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  /** null = new note; private is the default (NOTE-1). */
  note: TripNote | null;
}

const DISCARD_NEW_NOTE: DiscardConfirm = {
  title: 'Discard this note?',
  message: 'It hasn’t been saved yet, so what you’ve written will be lost.',
  confirmLabel: 'Discard',
};

const DISCARD_NOTE_EDITS: DiscardConfirm = {
  title: 'Discard changes?',
  message: 'Your edits to this note won’t be saved.',
  confirmLabel: 'Discard',
};

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

  const { control, handleSubmit, reset, setError, clearErrors, formState: { errors, isDirty, isSubmitting } } = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: defaultsFor(note),
  });
  const busy = save.isPending || remove.isPending || isSubmitting;
  const online = useIsOnline();
  // A locked field that still has focus would keep taking keystrokes.
  useEffect(() => {
    if (busy) Keyboard.dismiss();
  }, [busy]);

  useEffect(() => {
    if (visible) reset(defaultsFor(note));
  }, [visible, note, reset]);

  // A save queued offline can land after the sheet closed or reopened for
  // another note: it may only close (or report into) its own session.
  const [wasVisible, setWasVisible] = useState(visible);
  const [sessionId, setSessionId] = useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setSessionId(sessionId + 1);
  }
  const liveSession = useRef(0);
  useEffect(() => {
    liveSession.current = visible ? sessionId : -1;
  }, [visible, sessionId]);
  const isLive = (id: number) => liveSession.current === id;

  // A private note's text is never stored on the device, so offline its save
  // only waits while the app stays open.
  const isPrivate = useWatch({ control, name: 'isPrivate' });
  const offlineMessage = isPrivate
    ? busy
      ? PRIVATE_NOTE_OFFLINE_QUEUED
      : PRIVATE_NOTE_OFFLINE_HINT
    : busy
      ? EDITOR_OFFLINE_QUEUED
      : EDITOR_OFFLINE_HINT;

  // handleSubmit runs from the tap, not during render.
  const onSave = () =>
    handleSubmit(async (form) => {
      if (busy) return;
      const id = sessionId;
      clearErrors('root');
      try {
        await save.mutateAsync({ noteId: note?.id ?? null, input: form });
        if (isLive(id)) onClose();
      } catch (error) {
        if (isLive(id)) {
          markErrorShown(error);
          setError('root.server', { message: "Couldn't save your note. Your draft is still here — try Save again." });
        }
      }
    })();

  const onDelete = async () => {
    if (!note || busy) return;
    const confirmed = await confirmDestructive(
      'Delete this note?',
      note.isPrivate
        ? 'This private note is gone for good.'
        : 'It disappears for everyone on the trip.',
      'Delete',
    );
    if (!confirmed) return;
    const id = sessionId;
    clearErrors('root');
    try {
      await remove.mutateAsync({ noteId: note.id });
      if (isLive(id)) onClose();
    } catch (error) {
      if (isLive(id)) {
        markErrorShown(error);
        setError('root.server', { message: "Couldn't delete your note. Your draft is still here — try again." });
      }
    }
  };

  return (
    <Sheet
      visible={visible}
      title={note ? 'Edit note' : 'New note'}
      onClose={onClose}
      // A save already on its way can't be discarded.
      discardConfirm={isDirty && !busy ? (note ? DISCARD_NOTE_EDITS : DISCARD_NEW_NOTE) : null}
      actionLabel="Save"
      onAction={onSave}
      actionDisabled={busy}
    >
      {!online ? <OfflineNotice message={offlineMessage} reveal={busy} /> : null}
      {errors.root?.server?.message ? <ErrorBanner message={errors.root.server.message} /> : null}
      <Controller
        control={control}
        name="isPrivate"
        render={({ field }) => (
          <Card padded style={styles.privacyCard}>
            <View style={styles.privacyRow}>
              <View style={styles.privacyTitleRow}>
                {field.value ? (
                  <Lock size={17} color={colors.ink} strokeWidth={2} />
                ) : (
                  <Users size={17} color={colors.ink3} strokeWidth={2} />
                )}
                <View style={styles.privacyCopy}>
                  <AppText role="tagLabel">
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
                disabled={busy}
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
            editable={!busy}
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
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, busy && styles.disabled, pressed && styles.pressed]}
        >
          <AppText role="button" tone="danger">
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
  privacyCaption: {
    marginTop: 1,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.s2,
    minHeight: hitTargetMin,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: { opacity: disabledOpacity },
});
