import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';
import { packingItemSchema, type PackingItemForm } from '@/lib/validation/schemas';
import { confirmDestructive } from '@/lib/confirm';
import type { PackingItem, TripMember } from '@/lib/types';
import { useDeletePackingItem, useSavePackingItem } from './hooks';

interface PackingItemEditorProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  item: PackingItem | null;
  members: TripMember[];
}

function defaultsFor(item: PackingItem | null): PackingItemForm {
  return {
    label: item?.label ?? '',
    quantity: item?.quantity ?? 1,
    assignedTo: item?.assignedTo ?? null,
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

  const { control, handleSubmit, reset } = useForm<PackingItemForm>({
    resolver: zodResolver(packingItemSchema),
    defaultValues: defaultsFor(item),
  });

  useEffect(() => {
    if (visible) reset(defaultsFor(item));
  }, [visible, item, reset]);

  const onSave = handleSubmit(async (form) => {
    await save.mutateAsync({
      itemId: item?.id ?? null,
      input: {
        label: form.label,
        quantity: form.quantity,
        assignedTo: form.assignedTo,
      },
    });
    onClose();
  });

  const onDelete = async () => {
    if (!item) return;
    const confirmed = await confirmDestructive(
      'Delete this item?',
      'It disappears from the packing list for everyone on the trip.',
      'Delete',
    );
    if (!confirmed) return;
    await remove.mutateAsync(item.id);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title={item ? 'Edit item' : 'New item'}
      onClose={onClose}
      actionLabel={item ? 'Save' : 'Add'}
      onAction={onSave}
      actionDisabled={save.isPending}
    >
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
          />
        )}
      />
      <Controller
        control={control}
        name="quantity"
        render={({ field }) => (
          <View>
            <AppText role="label" style={styles.groupLabel}>
              Quantity
            </AppText>
            <View style={styles.stepperRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                accessibilityState={{ disabled: field.value <= 1 }}
                disabled={field.value <= 1}
                onPress={() => field.onChange(field.value - 1)}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    backgroundColor: colors.surface.bg,
                    borderColor: colors.hairline.strong,
                    opacity: field.value <= 1 ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Minus size={16} color={colors.text.secondary} strokeWidth={2} />
              </Pressable>
              <AppText role="heading" style={styles.stepperValue}>
                {field.value}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                onPress={() => field.onChange(field.value + 1)}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    backgroundColor: colors.surface.bg,
                    borderColor: colors.hairline.strong,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Plus size={16} color={colors.text.secondary} strokeWidth={2} />
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
            <AppText role="label" style={styles.groupLabel}>
              Who&apos;s bringing it?
            </AppText>
            <View style={styles.assigneeRow}>
              {members.map((member, index) => (
                <Chip
                  key={member.userId}
                  label={member.profile.displayName.split(' ')[0]}
                  selected={field.value === member.userId}
                  onPress={() => field.onChange(member.userId)}
                  leading={
                    <Avatar
                      name={member.profile.displayName}
                      avatarPath={member.profile.avatarPath}
                      size={26}
                      toneIndex={index}
                    />
                  }
                />
              ))}
              <Chip
                label="No one yet"
                selected={field.value === null}
                onPress={() => field.onChange(null)}
              />
            </View>
          </View>
        )}
      />
      {item ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <AppText role="label" tone="danger">
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
    borderRadius: radius.md,
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
