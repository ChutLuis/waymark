import { useRef, useState } from 'react';
import {
  Animated,
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
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { ErrorBanner } from '@/components/ErrorBanner';
import { useLazyAnimatedValue } from '@/components/useLazyAnimatedValue';
import { TextField } from '@/components/TextField';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { KraftEnvelope, WaxSeal } from '@/components/airmail/KraftEnvelope';
import { useSignUp } from '@/features/auth/hooks';
import { peekPendingInviteCode } from '@/features/invites/pendingInvite';
import { STRENGTH_LABELS, strengthOf } from '@/features/auth/passwordStrength';
import { radius, spacing, useTheme } from '@/theme';
import { signUpSchema, type SignUpForm } from '@/lib/validation/schemas';

/** Scroll distance over which the postcard shadows fade out (N35). */
const SHADOW_FADE = 48;

function friendlyMessage(error: Error): string {
  if (/already registered/i.test(error.message)) {
    return 'There is already an account with that email. Sign in instead.';
  }
  if (/network/i.test(error.message)) {
    return "Couldn't reach Waymark. Check your connection and try again.";
  }
  return "Couldn't create the account. Try again.";
}

function StrengthMeter({ score }: { score: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.meterRow}>
      {[0, 1, 2, 3].map((index) => {
        const filled = index < score;
        if (!filled) {
          return (
            <View
              key={index}
              style={[styles.emptyStamp, { borderColor: colors.slot }]}
            />
          );
        }
        return (
          <PerforatedStamp key={index} width={20} height={24} size="xs" tone="ink" />
        );
      })}
      <AppText role="kicker" tone="secondary" style={styles.meterLabel}>
        {STRENGTH_LABELS[score]}
      </AppText>
    </View>
  );
}

export default function SignUpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const signUp = useSignUp();
  const [banner, setBanner] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const isWide = width >= 720;

  const { control, handleSubmit, watch } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const password = watch('password');
  const scrollRef = useRef<ScrollView>(null);
  // The postcard shadows fade out as the page scrolls and are gone before the
  // cards reach the status band, so nothing spills below it (N35).
  const scrollY = useLazyAnimatedValue(0);
  const [bodyY, setBodyY] = useState(0);
  const [promiseY, setPromiseY] = useState(0);
  const shadowGoneAt = Math.max(bodyY + promiseY - insets.top - spacing.s3, 1);
  const shadowOpacity = scrollY.interpolate({
    inputRange: [Math.max(shadowGoneAt - SHADOW_FADE, 0), shadowGoneAt],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  // The password field sits above the strength meter and the privacy note;
  // scroll the meter fully into view when the field is focused (N21).
  const onPasswordFocus = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);

  const onSubmit = handleSubmit(async (form) => {
    setBanner(null);
    try {
      const result = await signUp.mutateAsync(form);
      if (!result.hasSession) setAwaitingConfirmation(true);
    } catch (error) {
      setBanner(friendlyMessage(error as Error));
    }
  });

  if (awaitingConfirmation) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + 40, paddingHorizontal: spacing.gutter }]}>
        <ScreenStatusBar />
        <AppText role="title">Check your email</AppText>
        <AppText role="body" tone="secondary" style={styles.subtitle}>
          We sent a confirmation link. Open it, then sign in.
        </AppText>
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={styles.confirmLink}>
            <AppText role="button">Back to sign in</AppText>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      // Edge-to-edge (SDK 57) ignores adjustResize, so Android needs an explicit
      // behaviour or the focused field stays under the keyboard (item 33).
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScreenStatusBar />
    {/* Opaque page-coloured band behind the status bar (N18): scrolling content
        passes under this, never under the clock. */}
    <View
      pointerEvents="none"
      style={[styles.statusBand, { height: insets.top, backgroundColor: colors.bg }]}
    />
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }, isWide && styles.contentWide]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      })}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <ChevronLeft size={24} color={colors.ink} strokeWidth={2.2} />
      </Pressable>

      <View style={styles.body} onLayout={(event) => setBodyY(event.nativeEvent.layout.y)}>
        <AppText role="kicker" tone="secondary">NEW HERE</AppText>
        <AppText role="title" style={styles.title}>Create an account</AppText>
        {/* Coming from an invite code? Say so — the code is stashed and replays on
            /join once the account exists (N11). peek() does not consume it. */}
        <AppText role="body" tone="secondary" style={styles.subtitle}>
          {peekPendingInviteCode()
            ? 'Then we\u2019ll drop you straight into the trip you were invited to.'
            : 'Then start a trip and invite the person you\u2019re going with.'}
        </AppText>

        <View style={styles.promiseRow} onLayout={(event) => setPromiseY(event.nativeEvent.layout.y)}>
          <View style={styles.promiseSlot}>
            <Animated.View
              pointerEvents="none"
              style={[styles.promiseShadow, { backgroundColor: colors.paper, opacity: shadowOpacity }]}
            />
            <View style={[styles.promise, { backgroundColor: colors.paper }]}>
              <View style={styles.promiseStamp}>
                <PerforatedStamp width={24} height={28} size="xs" tone="airmailBlue">
                  <View style={[styles.promiseInner, { borderColor: 'rgba(255,252,245,0.7)' }]} />
                </PerforatedStamp>
              </View>
              <AppText role="kicker">POSTCARDS</AppText>
              <AppText role="link" style={styles.promiseText}>Shared with the person you invite</AppText>
            </View>
          </View>
          <View style={styles.promiseSlot}>
            <Animated.View
              pointerEvents="none"
              style={[styles.promiseShadow, { backgroundColor: colors.kraft, opacity: shadowOpacity }]}
            />
            <KraftEnvelope flapHeight={24} style={[styles.promise]}>
              <View style={styles.promiseSeal}>
                <WaxSeal size={24} />
              </View>
              <View style={styles.promiseEnvelopeText}>
                <AppText role="kicker" style={{ color: colors.ink }}>SEALED NOTES</AppText>
                <AppText role="link" style={[styles.promiseText, { color: colors.ink }]}>
                  Only you can open them
                </AppText>
              </View>
            </KraftEnvelope>
          </View>
        </View>

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
              />
            )}
          />
        </View>
        <View style={styles.passwordGap}>
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
                onFocus={onPasswordFocus}
                error={fieldState.error?.message}
                secureTextEntry
                autoComplete="new-password"
                onSubmitEditing={onSubmit}
              />
            )}
          />
        </View>
        <StrengthMeter score={strengthOf(password)} />

        <AppText role="bodySm" tone="secondary" style={styles.privacy}>
          We keep only what your trips need.{' '}
          <AppText
            role="link"
            accessibilityRole="link"
            onPress={() => router.push('/privacy')}
            style={{ color: colors.ink, textDecorationLine: 'underline' }}
          >
            Read the privacy note
          </AppText>
        </AppText>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 34 }]}>
        <Button
          label="Create account"
          size="lg"
          onPress={onSubmit}
          loading={signUp.isPending}
        />
        <View style={styles.signInRow}>
          <AppText role="body" tone="secondary">Already have one? </AppText>
          <Link href="/sign-in" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <AppText role="button">Sign in</AppText>
            </Pressable>
          </Link>
        </View>
      </View>
    </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Pinned over the top inset so scrolling content slides beneath it (N18).
  statusBand: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  content: { paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  pressed: { opacity: 0.7 },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  subtitle: { marginTop: spacing.s3 },
  promiseRow: { flexDirection: 'row', gap: spacing.s5, marginTop: spacing.s9 },
  promiseSlot: { flex: 1, height: 112 },
  // The shadow lives on its own layer behind each card so it can fade with
  // scroll on the native driver; the card faces themselves cast none.
  promiseShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.card,
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  promise: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.s5,
    justifyContent: 'flex-end',
    boxShadow: [],
  },
  promiseStamp: { position: 'absolute', right: 12, top: 12 },
  promiseInner: { flex: 1, margin: 2, borderWidth: 1 },
  promiseSeal: { position: 'absolute', top: 10, left: '50%', marginLeft: -12 },
  promiseEnvelopeText: { position: 'absolute', left: spacing.s5, right: spacing.s5, bottom: spacing.s5 },
  promiseText: { marginTop: 4 },
  bannerWrap: { marginTop: spacing.s7 },
  fieldGap: { marginTop: spacing.s9 },
  passwordGap: { marginTop: 12 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3, marginTop: spacing.s4 },
  emptyStamp: { width: 20, height: 24, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 2 },
  meterLabel: { marginLeft: 4 },
  privacy: { marginTop: spacing.s7 },
  bottom: { paddingHorizontal: spacing.gutter, paddingTop: spacing.s7, gap: spacing.s2 },
  signInRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  confirmLink: { marginTop: spacing.s7 },
});
