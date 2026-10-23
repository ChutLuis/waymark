import { useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onlineManager } from '@tanstack/react-query';
import { Check, Lock, Mail } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { useIsOnline } from '@/lib/useIsOnline';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { Postcard } from '@/components/airmail/Postcard';
import { TripScene } from '@/features/trips/TripScene';
import { SceneStamp } from '@/features/trips/SceneStamp';
import { TripPreviewCard } from '@/features/trips/TripPreviewCard';
import { useAcceptInvite, usePreviewTripInvite } from '@/features/invites/hooks';
import { InviteCodeEntry } from '@/features/invites/InviteCodeEntry';
import { INVITE_CODE_LENGTH, sanitizeInviteCode } from '@/features/invites/inviteCode';
import {
  DESTINATION_INFO,
  matchDestination,
  formatTripRange,
  daysUntilLabelUppercase,
  stampName,
} from '@/features/trips/destinations';
import { OFFLINE_MESSAGE, isNetworkError } from '@/features/trips/errors';
import { stampLabel } from '@/features/trips/sheet';
import { iconStrokeWidth, spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';
import { takePendingInviteCode } from '@/features/invites/pendingInvite';
import { primeShell } from '@/features/trips/expandStore';

const LENGTH = INVITE_CODE_LENGTH;

function friendlyMessage(error: Error): string {
  if (isNetworkError(error)) return OFFLINE_MESSAGE;
  if (/invalid invite/i.test(error.message)) {
    return "That code doesn't match an invite. Check it and try again.";
  }
  if (/already used/i.test(error.message)) {
    return 'That invite was already used. Ask for a new invite.';
  }
  if (/expired/i.test(error.message)) {
    return 'That invite has expired. Ask for a new invite.';
  }
  // The server pauses lookups for 15 minutes after ten codes that matched nothing.
  if (/too many attempts/i.test(error.message)) {
    return 'Too many codes that didn’t match. Wait 15 minutes, then check the code and try again.';
  }
  return "Couldn't join the trip. Try again.";
}

export default function JoinScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  const acceptInvite = useAcceptInvite();
  const online = useIsOnline();

  const initialCode = typeof linkCode === 'string' ? linkCode : '';
  const [code, setCode] = useState(sanitizeInviteCode(initialCode));
  const [banner, setBanner] = useState<string | null>(null);
  const isWide = width >= 720;

  const complete = code.length === LENGTH;
  const preview = usePreviewTripInvite(complete ? code : null);
  const country = preview.data ? matchDestination(preview.data.destination) : null;
  // Already on the trip: open it, never spend the code (N36).
  const isMember = preview.data?.isMember ?? false;
  const artWidth = Math.min(width, 440) - spacing.gutter * 2 - 14;
  // Offline, the preview and the join would wait for the connection, spinning
  // without a word; say so instead. Opening a trip you're on needs no network.
  const offline = !online && complete && !isMember;
  const message =
    banner ?? (offline ? OFFLINE_MESSAGE : preview.isError ? friendlyMessage(preview.error as Error) : null);
  // A preview that never reached the server says nothing about the code.
  const previewRejected = preview.isError && !isNetworkError(preview.error);

  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  const openTrip = () => {
    if (preview.data) {
      primeShell(false);
      router.replace(`/trips/${preview.data.tripId}` as never);
    }
  };

  const onJoin = async () => {
    setBanner(null);
    if (!onlineManager.isOnline()) return;
    try {
      const tripId = await acceptInvite.mutateAsync(code);
      primeShell(false);
      router.replace(`/trips/${tripId}` as never);
    } catch (error) {
      setBanner(friendlyMessage(error as Error));
    }
  };

  const countdown = preview.data
    ? daysUntilLabelUppercase(preview.data.startDate, toDateOnly(new Date()))
    : null;
  const previewMeta = preview.data
    ? [
        `from ${preview.data.inviterName}`,
        formatTripRange(preview.data.startDate, preview.data.endDate),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const leaveInvite = () => {
    takePendingInviteCode();
    router.dismissTo('/');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }, isWide && styles.contentWide]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScreenStatusBar />
      <BackButton onPress={leaveInvite} />

      <View style={styles.body}>
        <AppText role="kicker" tone="secondary">JOIN A TRIP</AppText>
        <AppText role="title" style={styles.title}>Enter your code</AppText>

        <InviteCodeEntry
          value={code}
          onChangeText={(next) => {
            setCode(next);
            setBanner(null);
          }}
          autoFocus={!linkCode}
          onSubmit={() => {
            if (isMember) openTrip();
            else if (complete && !acceptInvite.isPending) onJoin();
          }}
        >
        {complete && preview.isSuccess ? (
          <View style={styles.foundRow}>
            <View style={[styles.foundCircle, { backgroundColor: colors.ink }]}>
              <Check size={13} color={colors.paper} strokeWidth={3.2} />
            </View>
            <AppText role="link" style={styles.foundText}>
              {isMember ? `You’re already on ${preview.data.name}` : 'Code found'}
            </AppText>
          </View>
        ) : null}
        {message ? (
          <AppText role="bodySm" accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
            {message}
          </AppText>
        ) : null}
        </InviteCodeEntry>

        {preview.data ? (
          <View style={styles.previewBlock}>
            <AppText role="kicker" tone="secondary" style={styles.sentKicker}>
              {preview.data.inviterName.split(' ')[0].toUpperCase()} SENT YOU
            </AppText>
            <View style={styles.postcardWrap}>
              {country ? (
                <Postcard
                  rotation={-1.5}
                  padding={7}
                  shadow="postcardJoin"
                  caption={DESTINATION_INFO[country].caption}
                  captionCorner="bottomLeft"
                >
                  <TripScene country={country} crop="header" width={artWidth} height={150} live />
                </Postcard>
              ) : (
                // No scene art: New trip's cream postcard, addressed to the
                // destination, with its stamp at the top right (N40).
                <TripPreviewCard
                  pattern="airmail"
                  stamp={
                    <SceneStamp
                      band="md"
                      image={null}
                      initial={stampLabel(preview.data.destination, preview.data.name)}
                      name={stampName(preview.data.destination)}
                    />
                  }
                >
                  {preview.data.destination ? (
                    <AppText role="meta" tone="secondary" numberOfLines={2}>
                      {preview.data.destination}
                    </AppText>
                  ) : null}
                </TripPreviewCard>
              )}
            </View>
            <View style={styles.tripDetails}>
              <View style={styles.tripTitleRow}>
                <AppText role="cardTitleSm" numberOfLines={1} style={styles.tripName}>
                  {preview.data.name}
                </AppText>
                {countdown ? (
                  <AppText role="kicker" style={{ letterSpacing: 0.6 }}>{countdown}</AppText>
                ) : null}
              </View>
              <AppText role="meta" tone="secondary" style={styles.tripMeta}>
                {previewMeta}
              </AppText>
            </View>

            {/* What joining means; nothing to explain to someone already on it. */}
            {!isMember ? (
              <View style={styles.rules}>
                <View style={styles.rule}>
                  <View style={[styles.ruleCircle, { backgroundColor: colors.paper }]}>
                    <Mail size={17} color={colors.ink} strokeWidth={iconStrokeWidth} />
                  </View>
                  <AppText role="body" style={styles.ruleText}>
                    You&apos;ll both see the plan, packing and postcards.
                  </AppText>
                </View>
                <View style={styles.rule}>
                  <View
                    style={[
                      styles.ruleCircle,
                      { backgroundColor: colors.wax, borderWidth: 3, borderColor: colors.waxRing },
                    ]}
                  >
                    <Lock size={15} color={colors.paper} strokeWidth={2.4} />
                  </View>
                  <AppText role="body" style={styles.ruleText}>
                    Sealed notes stay sealed: {preview.data.inviterName.split(' ')[0]} can&apos;t open yours.
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 34) }]}>
        {isMember ? (
          <Button label="Open trip" size="lg" onPress={openTrip} />
        ) : (
          <Button
            label={preview.data ? `Join ${preview.data.name}` : 'Join trip'}
            size="lg"
            disabled={!complete || offline || previewRejected}
            loading={acceptInvite.isPending}
            onPress={onJoin}
          />
        )}
        <Button
          label="Not now"
          variant="text"
          size="sm"
          onPress={leaveInvite}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.s4 },
  foundCircle: { width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  // A definite width: with flexShrink, Android measured the cached preview's
  // line short on remount and clipped "You’re already on {trip}".
  foundText: { flex: 1 },
  error: { marginTop: spacing.s4 },
  previewBlock: { marginTop: spacing.s10 },
  sentKicker: { marginTop: 0 },
  postcardWrap: { marginTop: spacing.s5 },
  tripDetails: { marginTop: spacing.s7 },
  tripTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.s5 },
  tripName: { flex: 1, minWidth: 0, fontSize: 22, lineHeight: 26 },
  tripMeta: { marginTop: 2 },
  rules: { marginTop: spacing.s8, gap: spacing.s5 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s5 },
  ruleCircle: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, paddingTop: 5 },
  bottom: { paddingHorizontal: spacing.gutter, paddingTop: spacing.s11, gap: spacing.s2 },
});
