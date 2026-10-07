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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import {
  INVITE_CODE_LENGTH,
  InviteCodeEntry,
  sanitizeInviteCode,
} from '@/features/invites/InviteCodeEntry';
import { setPendingInviteCode } from '@/features/invites/pendingInvite';
import { iconStrokeWidth, spacing, useTheme } from '@/theme';

/**
 * Signed-out invite-code entry. The signed-in `/join` screen lives behind the
 * (app) session guard, so tapping "I have an invite code" on sign-in used to
 * bounce back to sign-in (N11). This screen takes the code, stashes it, and
 * sends the person to sign up; the code is then replayed on /join once a
 * session exists. No trip preview here: preview_trip_invite stays revoked for
 * anonymous callers.
 */
export default function InviteCodeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [code, setCode] = useState('');
  const isWide = width >= 720;

  const complete = code.length === INVITE_CODE_LENGTH;

  const onContinue = () => {
    if (!complete) return;
    setPendingInviteCode(code);
    router.push('/sign-up');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }, isWide && styles.contentWide]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.body}>
          <AppText role="kicker" tone="secondary">JOIN A TRIP</AppText>
          <AppText role="title" style={styles.title}>Enter your code</AppText>
          <AppText role="body" tone="secondary" style={styles.intro}>
            We&apos;ll set up your account, then drop you straight into the trip.
          </AppText>

          <InviteCodeEntry
            value={code}
            onChangeText={(text) => setCode(sanitizeInviteCode(text))}
            autoFocus
            onSubmit={onContinue}
          />
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 34 }]}>
          <Button
            label="Continue"
            size="lg"
            disabled={!complete}
            leading={<Mail size={20} color={complete ? colors.paper : colors.ink} strokeWidth={iconStrokeWidth} />}
            onPress={onContinue}
          />
          <Button label="Not now" variant="text" size="sm" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0, flexGrow: 1 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  pressed: { opacity: 0.7 },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter, flex: 1 },
  title: { marginTop: spacing.s3 },
  intro: { marginTop: spacing.s3 },
  bottom: { paddingHorizontal: spacing.gutter, paddingTop: spacing.s11, gap: spacing.s2 },
});