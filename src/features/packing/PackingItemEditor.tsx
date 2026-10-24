import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { ErrorBanner } from '@/components/ErrorBanner';
import { EDITOR_OFFLINE_HINT, EDITOR_OFFLINE_QUEUED, OfflineNotice } from '@/components/OfflineNotice';
import { Sheet, type DiscardConfirm } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { disabledOpacity, hairlineWidth, pressedOpacity, radius, spacing, useTheme } from '@/theme';
import { packingItemSchema, type PackingItemForm } from '@/lib/validation/schemas';
import { confirmDestructive } from '@/lib/confirm';
import type { PackingItem, TripMember } from '@/lib/types';
import { useIsOnline } from '@/lib/useIsOnline';
import { markErrorShown } from '@/features/offline/queuedErrors';
import { useDeletePackingItem, useSavePackingItem } from './hooks';

interface PackingItemEditorProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  item: PackingItem | null;
  members: TripMember[];
}

const DISCARD_NEW_ITEM: DiscardConfirm = {
  title: 'Discard this item?',
  message: 'It hasn’t been added to the list yet.',
  confirmLabel: 'Discard',
};

const DISCARD_ITEM_EDITS: DiscardConfirm = {
  title: 'Discard changes?',
  message: 'Your edits to this item won’t be saved.',
  confirmLabel: 'Discard',
};

function defaultsFor(item: PackingItem | null, members: TripMember[]): PackingItemForm {
  // An item assigned to someone who has left the trip reads as unassigned, so
  // saving it clears the stale assignment instead of failing on a non-member.
  const assignedTo =
    item?.assignedTo && members.some((m) => m.userId === item.assignedTo) ? item.assignedTo : null;
  return {
    label: item?.label ?? '',
    quantity: item?.quantity ?? 1,
    assignedTo,
  };
}

export function PackingItemEditor({
  visible,
  onClose,
  tripId,
  item,
  members,
}: PackingItemEditorProps) {
  const { colors } = useTheme();
  const save = useSavePackingItem(tripId);
  const remove = useDeletePackingItem(tripId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const online = useIsOnline();

  const { control, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<PackingItemForm>({
    resolver: zodResolver(packingItemSchema),
    defaultValues: defaultsFor(item, members),
  });
  // Locked (no second save, no discard) until what was sent lands.
  const busy = isSubmitting || save.isPending || remove.isPending;
  const saving = useRef(false);
  // A locked field that still has focus would keep taking keystrokes.
  useEffect(() => {
    if (busy) Keyboard.dismiss();
  }, [busy]);

  // A fresh open starts without the last attempt's error, as a new session.
  const [wasVisible, setWasVisible] = useState(visible);
  const [sessionId, setSessionId] = useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setSessionId(sessionId + 1);
    if (visible) setSaveError(null);
  }
  // A save queued offline can land after the sheet closed or reopened for
  // another item: it may only close (or report into) its own session.
  const liveSession = useRef(0);
  useEffect(() => {
    liveSession.current = visible ? sessionId : -1;
  }, [visible, sessionId]);
  const isLive = (id: number) => liveSession.current === id;

  useEffect(() => {
    if (visible) reset(defaultsFor(item, members));
  }, [visible, item, members, reset]);

  // handleSubmit runs from the tap, not during render.
  const onSave = () =>
    handleSubmit(async (form) => {
      if (saving.current) return;
      saving.current = true;
      const id = sessionId;
      setSaveError(null);
      try {
        await save.mutateAsync({
          itemId: item?.id ?? null,
          input: {
            label: form.label,
            quantity: form.quantity,
            assignedTo: form.assignedTo,
          },
        });
        if (isLive(id)) onClose();
      } catch (error) {
        // Keep the sheet open with what the user typed; the banner explains.
        if (isLive(id)) {
          markErrorShown(error);
          setSaveError("Couldn't save your item — check your connection and try again.");
        }
      } finally {
        saving.current = false;
      }
    })();

  const onDelete = async () => {
    if (!item || busy) return;
    const id = sessionId;
    const confirmed = await confirmDestructive(
      'Delete this item?',
      'It disappears from the packing list for everyone on the trip.',
      'Delete',
    );
    if (!confirmed) return;
    setSaveError(null);
    try {
      await remove.mutateAsync({ itemId: item.id });
      if (isLive(id)) onClose();
    } catch (error) {
      if (isLive(id)) {
        markErrorShown(error);
        setSaveError("Couldn't delete your item — check your connection and try again.");
      }
    }
  };

  return (
    <Sheet
      visible={visible}
      title={item ? 'Edit item' : 'New item'}
      onClose={onClose}
      // A save already on its way can't be discarded.
      discardConfirm={isDirty && !busy ? (item ? DISCARD_ITEM_EDITS : DISCARD_NEW_ITEM) : null}
      actionLabel={item ? 'Save' : 'Add'}
      onAction={onSave}
      actionDisabled={busy}
    >
      {!online ? <OfflineNotice message={busy ? EDITOR_OFFLINE_QUEUED : EDITOR_OFFLINE_HINT} reveal={busy} /> : null}
      {saveError ? <ErrorBanner message={saveError} /> : null}
      <Controller
        control={control}
        name="label"
        render={({ field, fieldState }) => (
          <TextField
            label="Item"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoFocus={!item}
            editable={!busy}
          />
        )}
      />
      <Controller
        control={control}
        name="quantity"
        render={({ field }) => (
          <View>
            <AppText role="kicker" style={styles.groupLabel}>
              Quantity
            </AppText>
            <View style={styles.stepperRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                accessibilityState={{ disabled: busy || field.value <= 1 }}
                disabled={busy || field.value <= 1}
                onPress={() => field.onChange(field.value - 1)}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    opacity: busy || field.value <= 1 ? disabledOpacity : pressed ? pressedOpacity : 1,
                  },
                ]}
              >
                <Minus size={16} color={colors.ink2} strokeWidth={2} />
              </Pressable>
              <AppText role="button" style={styles.stepperValue}>
                {field.value}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => field.onChange(field.value + 1)}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    opacity: busy ? disabledOpacity : pressed ? pressedOpacity : 1,
                  },
                ]}
              >
                <Plus size={16} color={colors.ink2} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        )}
      />
      <Controller
        control={control}
        name="assignedTo"
        render={({ field }) => (
          <View>
            <AppText role="kicker" style={styles.groupLabel}>
              Who&apos;s bringing it?
            </AppText>
            <View style={styles.assigneeRow}>
              {members.map((member, index) => (
                <Chip
                  key={member.userId}
                  label={member.profile.displayName.split(' ')[0]}
                  selected={field.value === member.userId}
                  onPress={() => field.onChange(member.userId)}
                  disabled={busy}
                  leading={
                    <Avatar
                      name={member.profile.displayName}
                      avatarPath={member.profile.avatarPath}
                      size={26}
                      filled={index === 0}
                    />
                  }
                />
              ))}
              <Chip
                label="No one yet"
                selected={field.value === null}
                onPress={() => field.onChange(null)}
                disabled={busy}
              />
            </View>
          </View>
        )}
      />
      {item ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            (pressed || remove.isPending) && styles.pressed,
          ]}
        >
          <AppText role="button" tone="danger">
            Delete item
          </AppText>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    marginBottom: spacing.s2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3 + 2,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    borderWidth: hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
  },
  assigneeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
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
