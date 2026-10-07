import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Lock, Mail } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Postcard } from '@/components/airmail/Postcard';
import { TripScene } from '@/features/trips/TripScene';
import { SceneStamp } from '@/features/trips/SceneStamp';
import { useAcceptInvite, usePreviewTripInvite } from '@/features/invites/hooks';
import {
  DESTINATION_INFO,
  matchDestination,
  formatTripRange,
  daysUntilLabelUppercase,
  stampName,
} from '@/features/trips/destinations';
import { iconStrokeWidth, radius, spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';

const LENGTH = 8;

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  const acceptInvite = useAcceptInvite();
  const inputRef = useRef<TextInput>(null);

  const initialCode = typeof linkCode === 'string' ? linkCode : '';
  const [code, setCode] = useState(initialCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LENGTH));
  const [banner, setBanner] = useState<string | null>(null);
  const isWide = width >= 720;

  const complete = code.length === LENGTH;
  const preview = usePreviewTripInvite(complete ? code : null);
  const country = preview.data ? matchDestination(preview.data.destination) : null;

  const chars = useMemo(() => Array.from({ length: LENGTH }, (_, i) => code[i] ?? ''), [code]);

  const onJoin = async () => {
    setBanner(null);
    try {
      const tripId = await acceptInvite.mutateAsync(code);
      router.replace(`/trips/${tripId}` as never);
    } catch (error) {
      setBanner(friendlyMessage(error as Error));
    }
  };

  const countdown = preview.data
    ? daysUntilLabelUppercase(preview.data.startDate, toDateOnly(new Date()))
    : null;

  return (
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit invite code"
          onPress={() => inputRef.current?.focus()}
          style={styles.codeRow}
        >
          {[0, 1].map((group) => (
            <View key={group} style={[styles.codeGroup, group === 1 && styles.codeGroupSpaced]}>
              {chars.slice(group * 4, group * 4 + 4).map((char, index) => (
                <View
                  key={group * 4 + index}
                  style={[styles.codeBox, { backgroundColor: colors.paper, borderColor: colors.ink }]}
                >
                  <AppText role="codeBox" style={{ color: colors.ink }}>
                    {char}
                  </AppText>
                </View>
              ))}
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LENGTH))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={LENGTH}
          accessibilityLabel="Invite code"
          style={styles.hiddenInput}
          autoFocus={!linkCode}
          onSubmitEditing={() => {
            if (complete && !acceptInvite.isPending) onJoin();
          }}
        />

        {complete && preview.isSuccess ? (
          <View style={styles.foundRow}>
            <View style={[styles.foundCircle, { backgroundColor: colors.ink }]}>
              <Check size={13} color={colors.paper} strokeWidth={3.2} />
            </View>
            <AppText role="link">Code found</AppText>
          </View>
        ) : null}
        {banner || preview.isError ? (
          <AppText role="bodySm" style={[styles.error, { color: colors.wax }]}>
            {banner ?? friendlyMessage(preview.error as Error)}
          </AppText>
        ) : null}

        {preview.data ? (
          <View style={styles.previewBlock}>
            <AppText role="kicker" tone="secondary" style={styles.sentKicker}>
              {preview.data.inviterName.split(' ')[0].toUpperCase()} SENT YOU
            </AppText>
            <View style={styles.postcardWrap}>
              <Postcard
                rotation={-1.5}
                padding={7}
                shadow="postcardJoin"
                caption={country ? DESTINATION_INFO[country].caption : undefined}
                captionCorner="bottomLeft"
              >
                {country ? (
                  <TripScene
                    country={country}
                    crop="header"
                    width={Math.min(width, 440) - spacing.gutter * 2 - 14}
                    height={150}
                    live
                  />
                ) : (
                  <View
                    style={[
                      styles.unknownArt,
                      { width: Math.min(width, 440) - spacing.gutter * 2 - 14 },
                    ]}
                  >
                    <SceneStamp
                      band="xs"
                      image={null}
                      initial={(preview.data.name[0] ?? '?').toUpperCase()}
                      name={stampName(preview.data.destination)}
                    />
                  </View>
                )}
              </Postcard>
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
                from {preview.data.inviterName} · {formatTripRange(preview.data.startDate, preview.data.endDate)}
              </AppText>
            </View>

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
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 34 }]}>
        <Button
          label={preview.data ? `Join ${preview.data.name}` : 'Join trip'}
          size="lg"
          disabled={!complete || preview.isError}
          loading={acceptInvite.isPending}
          onPress={onJoin}
        />
        <Button label="Not now" variant="text" size="sm" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  pressed: { opacity: 0.7 },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  codeRow: { flexDirection: 'row', marginTop: spacing.s9 },
  codeGroup: { flexDirection: 'row', gap: 6 },
  codeGroupSpaced: { marginLeft: 14 },
  codeBox: {
    width: 36,
    height: 54,
    borderRadius: radius.codeBox,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.s4 },
  foundCircle: { width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  error: { marginTop: spacing.s4 },
  previewBlock: { marginTop: spacing.s10 },
  sentKicker: { marginTop: 0 },
  postcardWrap: { marginTop: spacing.s5 },
  unknownArt: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripDetails: { marginTop: spacing.s7 },
  tripTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.s5 },
  tripName: { flexShrink: 1, fontSize: 22, lineHeight: 26 },
  tripMeta: { marginTop: 2 },
  rules: { marginTop: spacing.s8, gap: spacing.s5 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s5 },
  ruleCircle: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, paddingTop: 5 },
  bottom: { paddingHorizontal: spacing.gutter, paddingTop: spacing.s11, gap: spacing.s2 },
});