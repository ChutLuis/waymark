import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { AuthScreenShell } from '@/features/auth/AuthScreenShell';
import { useSignIn } from '@/features/auth/hooks';
import { spacing } from '@/theme';
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

export default function SignInScreen() {
  const signIn = useSignIn();
  const [banner, setBanner] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (form) => {
    setBanner(null);
    try {
      await signIn.mutateAsync(form);
      // The (auth) layout redirects once the session lands.
    } catch (error) {
      setBanner(friendlyMessage(error as Error));
    }
  });

  return (
    <AuthScreenShell title="Welcome back" subtitle="Your trips are where you left them.">
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
          <TextField
            label="Password"
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
      <Button
        label="Sign in"
        onPress={onSubmit}
        loading={signIn.isPending}
        style={styles.submit}
      />
      <View style={styles.switchRow}>
        <AppText tone="secondary" style={styles.switchText}>
          New here?{' '}
        </AppText>
        <Link href="/sign-up" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <AppText role="label" tone="accent">
              Create an account
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
});
