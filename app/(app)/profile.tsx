import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import {
  useMyProfile,
  useSignOut,
  useUploadAvatar,
  useUpsertProfile,
} from '@/features/auth/hooks';
import { spacing, useTheme, type ThemePreference } from '@/theme';
import { pickImage } from '@/lib/images';
import { profileSchema, type ProfileForm } from '@/lib/validation/schemas';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function EditNameSheet({
  visible,
  onClose,
  currentName,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
}) {
  const upsertProfile = useUpsertProfile();
  const { control, handleSubmit, reset } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: currentName },
  });

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) reset({ displayName: currentName });
  }

  const onSave = handleSubmit(async (form) => {
    await upsertProfile.mutateAsync({ displayName: form.displayName });
    onClose();
  });

  return (
    <Sheet
      visible={visible}
      title="Your name"
      onClose={onClose}
      actionLabel="Save"
      onAction={onSave}
      actionDisabled={upsertProfile.isPending}
    >
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            label="Display name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoFocus
          />
        )}
      />
    </Sheet>
  );
}

export default function ProfileScreen() {
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const profile = useMyProfile();
  const signOut = useSignOut();
  const uploadAvatar = useUploadAvatar();
  const upsertProfile = useUpsertProfile();
  const [editVisible, setEditVisible] = useState(false);

  const onChangePhoto = async () => {
    const picked = await pickImage([1, 1]);
    if (!picked || !profile.data) return;
    const avatarPath = await uploadAvatar.mutateAsync(picked);
    await upsertProfile.mutateAsync({
      displayName: profile.data.displayName,
      avatarPath,
    });
  };

  const isWide = width >= 720;

  if (profile.isPending) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface.bg }]}>
        <LoadingState />
      </View>
    );
  }
  if (profile.isError || profile.data === null) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface.bg }]}>
        <ErrorState title="That didn't work" onRetry={() => profile.refetch()} />
      </View>
    );
  }

  const me = profile.data;

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.surface.bg, paddingTop: insets.top + spacing.s3 },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.s8 },
          isWide && styles.contentWide,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <ChevronLeft size={18} color={colors.text.secondary} strokeWidth={1.8} />
          <AppText tone="secondary" style={styles.backLabel}>
            Your trips
          </AppText>
        </Pressable>
        <AppText role="title" style={styles.title}>
          You
        </AppText>

        <Card padded style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change your photo"
              onPress={onChangePhoto}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Avatar name={me.displayName} avatarPath={me.avatarPath} size={64} />
            </Pressable>
            <View style={styles.profileText}>
              <AppText role="heading">{me.displayName}</AppText>
              {session?.user.email ? (
                <AppText role="caption" tone="muted" style={styles.email}>
                  {session.user.email}
                </AppText>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit display name"
              hitSlop={10}
              onPress={() => setEditVisible(true)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <AppText role="label" tone="accent">
                Edit
              </AppText>
            </Pressable>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionLabel style={styles.sectionLabel}>Appearance</SectionLabel>
          <Card padded>
            <View style={styles.themeRow}>
              <AppText style={styles.themeLabel}>Theme</AppText>
              <View style={styles.themeControl}>
                <SegmentedControl
                  options={THEME_OPTIONS}
                  value={preference}
                  onChange={setPreference}
                  accessibilityLabel="Theme"
                />
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Button
            label="Sign out"
            variant="destructive"
            loading={signOut.isPending}
            onPress={() => signOut.mutate()}
          />
        </View>

        <AppText role="caption" tone="faint" style={styles.footer}>
          Waymark 0.1 · Privacy
        </AppText>
      </ScrollView>
      <EditNameSheet
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        currentName={me.displayName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
  },
  contentWide: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    minHeight: 44,
  },
  backLabel: {
    fontSize: 14,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    marginTop: spacing.s2,
    marginBottom: spacing.s5,
  },
  profileCard: {
    marginBottom: spacing.s6,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3 + 2,
  },
  profileText: {
    flex: 1,
  },
  email: {
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.s6,
  },
  sectionLabel: {
    marginBottom: spacing.s2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  themeLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  themeControl: {
    flexShrink: 0,
    minWidth: 220,
  },
  footer: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
