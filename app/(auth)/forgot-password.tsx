import { useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { TextField } from '@/components/TextField';
import { useRequestPasswordReset } from '@/features/auth/hooks';
import { spacing, useTheme } from '@/theme';
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/lib/validation/schemas';

/**
 * The same words whether or not the email has an account, so the screen
 * can't be used to find out who uses Waymark. The link carries a PKCE code
 * that only this device can redeem, hence "on this device".
 */
function sentMessage(email: string): string {
  return `If an account exists for ${email}, a reset link is on its way. Open it on this device; it works once.`;
}

/** Asks for the account's email and sends a password-reset link (reached from Sign in). */
export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const requestReset = useRequestPasswordReset();
  const [banner, setBanner] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const isWide = width >= 720;

  const { control, handleSubmit, reset } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setBanner(null);
    try {
      await requestReset.mutateAsync({ email });
      setSentTo(email);
      AccessibilityInfo.announceForAccessibility(sentMessage(email));
    } catch (error) {
      setBanner((error as Error).message);
    }
  });

  const backToSignIn = () => (router.canGoBack() ? router.back() : router.replace('/sign-in'));

  const changeEmail = () => {
    reset({ email: sentTo ?? '' });
    setSentTo(null);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      // Edge-to-edge (SDK 57) ignores adjustResize, so Android needs an explicit
      // behaviour or the focused field stays under the keyboard.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenStatusBar band />
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }, isWide && styles.contentWide]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <BackButton fallbackHref="/sign-in" />

        <View style={styles.body}>
          {sentTo ? (
            <>
              <AppText role="kicker" tone="secondary">PASSWORD RESET</AppText>
              <AppText role="title" style={styles.title}>Check your email</AppText>
              <AppText role="body" tone="secondary" style={styles.subtitle}>
                {sentMessage(sentTo)}
              </AppText>
            </>
          ) : (
            <>
              <AppText role="kicker" tone="secondary">PASSWORD RESET</AppText>
              <AppText role="title" style={styles.title}>Forgot your password?</AppText>
              <AppText role="body" tone="secondary" style={styles.subtitle}>
                Enter the email you signed up with and we&apos;ll send you a link to choose a new
                password.
              </AppText>

              {banner ? (
                <View style={styles.bannerWrap}>
                  <ErrorBanner message={banner} />
                </View>
              ) : null}

              <View style={styles.fieldGap}>
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
                      returnKeyType="send"
                      autoFocus
                      onSubmitEditing={onSubmit}
                    />
                  )}
                />
              </View>
            </>
          )}
        </View>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 34) }]}>
          {sentTo ? (
            <>
              <Button label="Back to sign in" size="lg" onPress={backToSignIn} />
              <Button label="Use a different email" variant="text" size="sm" onPress={changeEmail} />
            </>
          ) : (
            <Button
              label="Send reset link"
              size="lg"
              onPress={onSubmit}
              loading={requestReset.isPending}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // flexGrow lets the bottom block sit at the screen's foot (marginTop auto).
  content: { flexGrow: 1, paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  subtitle: { marginTop: spacing.s3 },
  bannerWrap: { marginTop: spacing.s7 },
  fieldGap: { marginTop: spacing.s9 },
  bottom: { marginTop: 'auto', paddingHorizontal: spacing.gutter, paddingTop: spacing.s7, gap: spacing.s2 },
});
