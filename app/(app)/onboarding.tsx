import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Users } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { AvatarStamp, StampStill } from '@/features/trips/SceneStamp';
import { useSignOut, useUploadAvatar, useUpsertProfile } from '@/features/auth/hooks';
import { pickImage, type PickedImage } from '@/lib/images';
import { fontFamilies, radius, spacing, useTheme } from '@/theme';
import { profileSchema, type ProfileForm } from '@/lib/validation/schemas';

/** The one onboarding step: the name that signs every postcard. */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const upsertProfile = useUpsertProfile();
  const uploadAvatar = useUploadAvatar();
  const signOut = useSignOut();
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const isWide = width >= 720;

  const { control, handleSubmit, watch } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '' },
  });

  const name = watch('displayName');
  const initial = (name.trim()[0] ?? '?').toUpperCase();

  const onPickPhoto = async () => {
    const picked = await pickImage([1, 1]);
    if (picked) setPhoto(picked);
  };

  // Back leaves onboarding. With nothing behind it (the usual first run), sign
  // out: the account stays, and the auth gate returns to Sign in.
  const onBack = () => {
    if (router.canGoBack()) router.back();
    else signOut.mutate();
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      // Edge-to-edge (SDK 57) ignores adjustResize, so Android needs an explicit
      // behaviour or the focused field stays under the keyboard (item 33).
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScreenStatusBar />
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }, isWide && styles.contentWide]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          disabled={signOut.isPending}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <AppText role="display" style={styles.title}>What&apos;s your name?</AppText>
        <AppText role="body" tone="secondary" style={styles.subtitle}>
          It goes on everything you add, like the sender on a letter.
        </AppText>

        <View style={[styles.envelopeCard, { backgroundColor: colors.paper }]}>
          <View style={styles.avatarBlock}>
            <AvatarStamp
              size="md"
              initial={initial}
              name={name.trim() ? name.trim().toUpperCase() : 'YOU'}
              imageUri={photo?.uri ?? null}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={photo ? 'Change photo' : 'Add a photo, optional'}
              onPress={onPickPhoto}
              style={({ pressed }) => [styles.addPhoto, pressed && styles.pressed]}
            >
              <AppText role="link" style={styles.underlineLink}>Add photo</AppText>
            </Pressable>
          </View>

          <AppText role="kicker">FROM</AppText>
          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <View>
                <View style={[styles.fromInput, { borderBottomColor: colors.ink }]}>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    accessibilityLabel="Your name"
                    autoFocus
                    autoComplete="name"
                    onSubmitEditing={onContinue}
                    placeholderTextColor={colors.ink3}
                    selectionColor={colors.ink}
                    style={[styles.fromText, { color: colors.ink }]}
                  />
                </View>
                {fieldState.error?.message ? (
                  <AppText role="bodySm" style={{ color: colors.wax, marginTop: spacing.s2 }}>
                    {fieldState.error.message}
                  </AppText>
                ) : null}
              </View>
            )}
          />

          <AppText role="kicker" style={styles.toLabel}>TO</AppText>
          <View style={[styles.toLine, { borderBottomColor: colors.ruleWarm }]}>
            <AppText role="meta" tone="muted" style={styles.toText}>Whoever you travel with</AppText>
          </View>
        </View>

        <AppText role="kicker" tone="secondary" style={styles.howKicker}>HOW IT SHOWS UP</AppText>
        <View style={[styles.preview, { backgroundColor: colors.paper }]}>
          <View style={styles.previewStamp}>
            <StampStill country="japan" />
          </View>
          <View style={styles.previewHeader}>
            <Users size={15} color={colors.ink} strokeWidth={2.2} />
            <AppText role="kicker" style={styles.previewLabel}>
              SHARED · FROM {name.trim() ? name.trim().toUpperCase() : 'YOU'}
            </AppText>
          </View>
          <AppText role="body" style={styles.previewBody}>
            Bring socks for the tea ceremony.
          </AppText>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        <Button
          label="Continue"
          size="lg"
          onPress={onContinue}
          loading={upsertProfile.isPending || uploadAvatar.isPending}
        />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // flexGrow lets Continue sit at the screen's foot (marginTop auto).
  content: { flexGrow: 1, paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  header: { height: 48, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  pressed: { opacity: 0.7 },
  underlineLink: { textDecorationLine: 'underline' },
  body: { paddingTop: spacing.s7, paddingHorizontal: spacing.gutter },
  title: { letterSpacing: -0.5 },
  subtitle: { marginTop: spacing.s5, fontSize: 18, lineHeight: 26 },
  envelopeCard: {
    marginTop: spacing.s11,
    borderRadius: radius.card,
    paddingTop: spacing.s8,
    paddingHorizontal: spacing.s8,
    paddingBottom: spacing.s9,
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 12px 24px -12px rgba(21,34,59,0.4)',
  },
  avatarBlock: { position: 'absolute', right: 18, top: 18, alignItems: 'center', gap: 6 },
  addPhoto: { height: 28, justifyContent: 'center' },
  fromInput: { height: 46, marginTop: 6, marginRight: 84, borderBottomWidth: 2, justifyContent: 'center' },
  fromText: { fontFamily: fontFamilies.regular, fontSize: 26, lineHeight: 32, padding: 0 },
  toLabel: { marginTop: 26 },
  toLine: { height: 38, borderBottomWidth: 1, justifyContent: 'center' },
  toText: { fontSize: 17, lineHeight: 22 },
  howKicker: { marginTop: 30 },
  preview: {
    marginTop: spacing.s4,
    borderRadius: radius.card,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  // The stamp sits in the corner, outside the text flow, so it doesn't set
  // the header row's height. The header (which carries the typed name) keeps
  // clear of it; the fixed sample line runs full width on one line, as drawn,
  // which keeps the card at the design's 74 pt.
  previewStamp: { position: 'absolute', top: 11, right: 11 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 30 },
  previewLabel: { flexShrink: 1, letterSpacing: 0.6 },
  previewBody: { marginTop: 6 },
  bottom: { marginTop: 'auto', paddingHorizontal: spacing.gutter, paddingTop: spacing.s11 },
});
