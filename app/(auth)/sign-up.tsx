import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { AuthScreenShell } from '@/features/auth/AuthScreenShell';
import { useSignUp } from '@/features/auth/hooks';
import { spacing, useTheme } from '@/theme';
import { signUpSchema, type SignUpForm } from '@/lib/validation/schemas';

function friendlyMessage(error: Error): string {
  if (/already registered/i.test(error.message)) {
    return 'There is already an account with that email. Sign in instead.';
  }
  if (/network/i.test(error.message)) {
    return "Couldn't reach Waymark. Check your connection and try again.";
  }
  return "Couldn't create the account. Try again.";
}

export default function SignUpScreen() {
  const { colors } = useTheme();
  const signUp = useSignUp();
  const [banner, setBanner] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const { control, handleSubmit, watch } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const password = watch('password');

  const onSubmit = handleSubmit(async (form) => {
    setBanner(null);
    try {
      const result = await signUp.mutateAsync(form);
      // With a session the (auth) layout redirects into the app; without
      // one the project requires email confirmation first.
      if (!result.hasSession) setAwaitingConfirmation(true);
    } catch (error) {
      setBanner(friendlyMessage(error as Error));
    }
  });

  if (awaitingConfirmation) {
    return (
      <AuthScreenShell
        title="Check your email"
        subtitle="We sent a confirmation link. Open it, then sign in."
      >
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={styles.centered}>
            <AppText role="label" tone="accent">
              Back to sign in
            </AppText>
          </Pressable>
        </Link>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell title="Plan it together" subtitle="One shared plan. Your own private notes.">
      {banner ? <ErrorBanner message={banner} /> : null}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            autoFocus
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <View>
            <TextField
              label="Password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={onSubmit}
            />
            {!fieldState.error && password.length >= 8 ? (
              <View style={styles.hintRow}>
                <Check size={13} color={colors.semantic.success.base} strokeWidth={1.8} />
                <AppText
                  role="caption"
                  style={{ color: colors.semantic.success.base }}
                >
                  At least 8 characters — looks good.
                </AppText>
              </View>
            ) : null}
          </View>
        )}
      />
      <Button
        label="Create account"
        onPress={onSubmit}
        loading={signUp.isPending}
        style={styles.submit}
      />
      <View style={styles.switchRow}>
        <AppText tone="secondary" style={styles.switchText}>
          Already have one?{' '}
        </AppText>
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <AppText role="label" tone="accent">
              Sign in
            </AppText>
          </Pressable>
        </Link>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: spacing.s2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    lineHeight: 19,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s1 + 2,
    marginTop: spacing.s1 + 2,
  },
  centered: {
    alignItems: 'center',
  },
});
