import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { spacing } from '@/theme';
import { CONFIRM_EMAIL_MESSAGE, RESEND_SUCCESS_MESSAGE, resendFailureMessage } from './confirmation';
import { useResendConfirmation } from './hooks';

/** The address is captured from the request, never from a later form edit. */
export function ConfirmationResend({ email, banner = false }: { email: string; banner?: boolean }) {
  const resend = useResendConfirmation();
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);

  const onResend = async () => {
    if (resend.isPending) return;
    setFeedback(null);
    try {
      await resend.mutateAsync({ email });
      setFeedback({ message: RESEND_SUCCESS_MESSAGE, error: false });
    } catch (error) {
      setFeedback({ message: resendFailureMessage(error), error: true });
    }
  };

  return (
    <View>
      {banner ? (
        <ErrorBanner
          message={CONFIRM_EMAIL_MESSAGE}
          action={resend.isPending ? undefined : { label: 'Resend link', onPress: onResend }}
        />
      ) : (
        <Button label="Resend link" variant="secondary" onPress={onResend} loading={resend.isPending} />
      )}
      {banner && resend.isPending ? (
        <AppText role="bodySm" tone="secondary" style={styles.feedback}>Sending…</AppText>
      ) : null}
      {feedback ? (
        <View style={styles.feedback}>
          {feedback.error ? <ErrorBanner message={feedback.message} /> : (
            <AppText role="bodySm" accessibilityRole="alert">{feedback.message}</AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  feedback: { marginTop: spacing.s3 },
});
