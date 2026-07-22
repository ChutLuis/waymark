import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Svg, { Circle, Path } from 'react-native-svg';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { AuthScreenShell } from '@/features/auth/AuthScreenShell';
import { useUploadAvatar, useUpsertProfile } from '@/features/auth/hooks';
import { radius, spacing, useTheme } from '@/theme';
import { pickImage, type PickedImage } from '@/lib/images';
import { profileSchema, type ProfileForm } from '@/lib/validation/schemas';

function CameraMark() {
  const { colors } = useTheme();
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Path
        d="M4 8h3l2-3h6l2 3h3v11H4V8Z"
        fill="none"
        stroke={colors.text.faint}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={3.4} fill="none" stroke={colors.text.faint} strokeWidth={1.6} />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const upsertProfile = useUpsertProfile();
  const uploadAvatar = useUploadAvatar();
  const [photo, setPhoto] = useState<PickedImage | null>(null);

  const { control, handleSubmit } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '' },
  });

  const onPickPhoto = async () => {
    const picked = await pickImage([1, 1]);
    if (picked) setPhoto(picked);
  };

  const onContinue = handleSubmit(async (form) => {
    let avatarPath: string | undefined;
    if (photo) {
      try {
        avatarPath = await uploadAvatar.mutateAsync(photo);
      } catch {
        // The photo is optional; the name still goes through.
      }
    }
    await upsertProfile.mutateAsync({ displayName: form.displayName, avatarPath });
    router.replace('/');
  });

  return (
    <AuthScreenShell
      kicker="One last thing"
      title="What should we call you?"
      subtitle="Your name shows up on shared notes and packing assignments."
      footer={
        <Button
          label="Continue"
          onPress={onContinue}
          loading={upsertProfile.isPending || uploadAvatar.isPending}
        />
      }
    >
      <View style={styles.avatarBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Change photo' : 'Add a photo, optional'}
          onPress={onPickPhoto}
          style={({ pressed }) => [
            styles.avatarPlaceholder,
            { backgroundColor: colors.surface.sunken, borderColor: colors.text.faint },
            pressed && styles.pressed,
          ]}
        >
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]}
              contentFit="cover"
            />
          ) : (
            <CameraMark />
          )}
        </Pressable>
        <AppText role="label" tone="accent" onPress={onPickPhoto}>
          {photo ? 'Change photo' : 'Add a photo — optional'}
        </AppText>
      </View>
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
            autoComplete="name"
            onSubmitEditing={onContinue}
          />
        )}
      />
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.s2 + 2,
    marginBottom: spacing.s3,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
});
