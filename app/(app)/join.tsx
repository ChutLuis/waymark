import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { AuthScreenShell } from '@/features/auth/AuthScreenShell';
import { useAcceptInvite } from '@/features/invites/hooks';
import { fontFamilies, spacing } from '@/theme';
import { inviteCodeSchema, type InviteCodeForm } from '@/lib/validation/schemas';

function friendlyMessage(error: Error): string {
  if (/invalid invite/i.test(error.message)) {
    return "That code doesn't match an invite. Check it and try again.";
  }
  if (/already used/i.test(error.message)) {
    return 'That invite was already used. Ask for a new invite.';
  }
  if (/expired/i.test(error.message)) {
    return 'That invite has expired. Ask for a new invite.';
  }
  return "Couldn't join the trip. Try again.";
}

export default function JoinScreen() {
  // Links arrive as /join?code=XXXXXXXX and pre-fill the field (INV-2).
  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const acceptInvite = useAcceptInvite();
  const [banner, setBanner] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<InviteCodeForm>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { code: (linkCode ?? '').toUpperCase() },
  });

  const onJoin = handleSubmit(async (form) => {
    setBanner(null);
    try {
      const tripId = await acceptInvite.mutateAsync(form.code);
      router.replace(`/trips/${tripId}` as never);
    } catch (error) {
      setBanner(friendlyMessage(error as Error));
    }
  });

  return (
    <AuthScreenShell
      kicker="Invite"
      title="Join a trip"
      subtitle="Enter the 8-character code you were sent."
    >
      {banner ? <ErrorBanner message={banner} /> : null}
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            label="Invite code"
            value={field.value}
            onChangeText={(text) => field.onChange(text.toUpperCase())}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            autoFocus={!linkCode}
            inputStyle={styles.codeInput}
            onSubmitEditing={onJoin}
          />
        )}
      />
      <Button
        label="Join this trip"
        onPress={onJoin}
        loading={acceptInvite.isPending}
        style={styles.submit}
      />
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontFamily: fontFamilies.mono,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.s2,
  },
});
