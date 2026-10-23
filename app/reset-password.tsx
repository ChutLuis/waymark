import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthContext';
import { endPasswordRecovery, isPasswordRecovery } from '@/features/auth/authDeepLink';
import { PasswordUpdateError, useSignOut, useUpdatePassword } from '@/features/auth/hooks';
import { StrengthMeter } from '@/features/auth/StrengthMeter';
import { spacing, useTheme } from '@/theme';
import { resetPasswordSchema, type ResetPasswordForm } from '@/lib/validation/schemas';

/**
 * Sets a new password after a reset link. The callback route exchanges the
 * link's code, which signs the person in with a recovery session, then opens
 * this screen. It sits outside the (auth) and (app) groups so neither guard
 * redirects that session away before the password is saved.
 */
export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { session, isRestoring } = useAuth();
  const updatePassword = useUpdatePassword();
  const signOut = useSignOut();
  const [banner, setBanner] = useState<string | null>(null);
  const isWide = width >= 720;

  const { control, handleSubmit } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const goHome = () => {
    endPasswordRecovery();
    // A reset that began at Forgot password leaves the sign-in pages under this
    // one; clear them so Back from Home can't land there.
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  const onSubmit = handleSubmit(async (form) => {
    setBanner(null);
    try {
      await updatePassword.mutateAsync({ password: form.password });
      goHome();
    } catch (error) {
      if (error instanceof PasswordUpdateError && error.expired) {
        // The recovery session is gone: end it here too, which brings up the
        // expired state and its way to ask for a new link.
        signOut.mutate();
        return;
      }
      setBanner((error as Error).message);
    }
  });

  if (isRestoring) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <LoadingState />
      </View>
    );
  }

  // Only a session a reset link just created may set a password here.
  if (session && !isPasswordRecovery()) return <Redirect href="/" />;

  if (!session) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScreenStatusBar />
        <EmptyState
          title="That reset link has expired"
          body="Reset links work once, and only on the device that asked for them. Ask for a new one and open it here."
          actionLabel="Request a new link"
          onAction={() => router.replace('/forgot-password' as never)}
        >
          <Button
            label="Back to sign in"
            variant="text"
            size="sm"
            onPress={() => router.replace('/sign-in')}
            style={styles.secondaryAction}
          />
        </EmptyState>
      </View>
    );
  }

  const email = session.user.email;

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
        <View style={styles.body}>
          <AppText role="kicker" tone="secondary">PASSWORD RESET</AppText>
          <AppText role="title" style={styles.title}>Choose a new password</AppText>
          <AppText role="body" tone="secondary" style={styles.subtitle}>
            {email ? `For ${email}. ` : ''}You&apos;ll use it the next time you sign in.
          </AppText>

          {banner ? (
            <View style={styles.bannerWrap}>
              <ErrorBanner message={banner} />
            </View>
          ) : null}

          <View style={styles.fieldGap}>
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <TextField
                  label="NEW PASSWORD"
                  revealable
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  secureTextEntry
                  autoComplete="new-password"
                  autoFocus
                  onSubmitEditing={onSubmit}
                />
              )}
            />
          </View>
          <StrengthMeter password={password} />
        </View>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 34) }]}>
          <Button
            label="Save new password"
            size="lg"
            onPress={onSubmit}
            loading={updatePassword.isPending || signOut.isPending}
          />
          <Button label="Not now" variant="text" size="sm" onPress={goHome} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // flexGrow lets the bottom block sit at the screen's foot (marginTop auto).
  content: { flexGrow: 1, paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  body: { paddingTop: spacing.s12, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  subtitle: { marginTop: spacing.s3 },
  bannerWrap: { marginTop: spacing.s7 },
  fieldGap: { marginTop: spacing.s9 },
  bottom: { marginTop: 'auto', paddingHorizontal: spacing.gutter, paddingTop: spacing.s7, gap: spacing.s2 },
  secondaryAction: { marginTop: spacing.s3 },
});
