import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { BrandMark } from '@/components/BrandMark';
import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { Postcard } from '@/components/airmail/Postcard';
import { TripScene } from '@/features/trips/TripScene';
import { useSignIn } from '@/features/auth/hooks';
import { iconStrokeWidth, spacing, useTheme } from '@/theme';
import { signInSchema, type SignInForm } from '@/lib/validation/schemas';

function friendlyMessage(error: Error): string {
  if (/invalid login credentials/i.test(error.message)) {
    return "That email and password don't match. Try again.";
  }
  if (/network/i.test(error.message)) {
    return "Couldn't reach Waymark. Check your connection and try again.";
  }
  return 'Something went wrong signing you in. Try again.';
}

/**
 * The stacked back postcards behind the front sign-in postcard. The stack is
 * authored for a 390 pt screen; below that it scales down as a whole so nothing
 * overhangs or clips (item 07), and above it stays centred at full size.
 */
function PostcardStack() {
  const { width } = useWindowDimensions();
  const scale = Math.min(1, width / 390);
  return (
    <View style={[styles.stackOuter, { height: 290 * scale }]}>
    <View style={[styles.stack, { transform: [{ scale }], transformOrigin: 'top center' }]}>
        <View style={[styles.backCardWrap, styles.backLeft]}>
          <Postcard
            rotation={-8}
            padding={6}
            caption="Chiang Mai"
            captionCorner="topLeft"
          >
            <TripScene country="thailand" crop="header" width={200} height={130} />
          </Postcard>
        </View>
        <View style={[styles.backCardWrap, styles.backRight]}>
          <Postcard rotation={7} padding={6} caption="Paris" captionCorner="topRight">
            <TripScene country="france" crop="header" width={200} height={130} />
          </Postcard>
        </View>
        <View style={styles.frontCardWrap}>
          <Postcard
            rotation={-2}
            padding={7}
            shadow="postcardFront"
            caption="Kyoto"
            captionCorner="bottomLeft"
          >
            <TripScene country="japan" crop="header" width={222} height={144} live />
          </Postcard>
        </View>
    </View>
    </View>
  );
}

export default function SignInScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const signIn = useSignIn();
  const router = useRouter();
  const [banner, setBanner] = useState<string | null>(null);
  const isWide = width >= 720;

  const { control, handleSubmit } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (form) => {
    setBanner(null);
    try {
      await signIn.mutateAsync(form);
    } catch (error) {
      setBanner(friendlyMessage(error as Error));
    }
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      // Edge-to-edge (SDK 57) ignores adjustResize, so Android needs an explicit
      // behaviour or the focused field stays under the keyboard.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }, isWide && styles.contentWide]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.brandRow}>
        <BrandMark />
        <AppText role="wordmark" style={styles.wordmark}>
          Waymark
        </AppText>
      </View>

      <PostcardStack />

      <View style={styles.form}>
        <AppText role="title">Welcome back.</AppText>
        {banner ? (
          <View style={styles.bannerWrap}>
            <ErrorBanner message={banner} />
          </View>
        ) : null}
        <View style={styles.fieldGapFirst}>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="EMAIL"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
            )}
          />
        </View>
        <View style={styles.fieldGap}>
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                label="PASSWORD"
                revealable
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureTextEntry
                autoComplete="current-password"
                onSubmitEditing={onSubmit}
              />
            )}
          />
        </View>
        <Button
          label="Sign in"
          size="lg"
          onPress={onSubmit}
          loading={signIn.isPending}
          style={styles.submit}
        />
        <View style={styles.linkRow}>
          <Link href="/sign-up" asChild>
            <Pressable accessibilityRole="link" hitSlop={8} style={styles.linkTarget}>
              <AppText role="button">Create an account</AppText>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 34 }]}>
        <Button
          label="I have an invite code"
          variant="quiet"
          size="md"
          leading={<Mail size={20} color={colors.ink} strokeWidth={iconStrokeWidth} />}
          onPress={() => router.push('/invite-code')}
        />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingHorizontal: spacing.gutter },
  wordmark: { fontSize: 22, lineHeight: 26 },
  stackOuter: { width: '100%', overflow: 'visible' },
  stack: { width: 390, height: 290, position: 'relative', alignSelf: 'center' },
  backCardWrap: { position: 'absolute' },
  backLeft: { left: 10, top: 30, width: 212, height: 142 },
  backRight: { left: 168, top: 20, width: 212, height: 142 },
  frontCardWrap: { position: 'absolute', left: 72, top: 122, width: 236, height: 158 },
  form: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  bannerWrap: { marginTop: spacing.s7 },
  fieldGapFirst: { marginTop: 18 },
  fieldGap: { marginTop: 12 },
  submit: { marginTop: spacing.s7 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  linkTarget: { height: 44, justifyContent: 'center' },
  bottom: { paddingHorizontal: spacing.gutter, paddingTop: spacing.s3 },
});