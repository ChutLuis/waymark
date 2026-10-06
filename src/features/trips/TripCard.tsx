import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { AirmailBorder } from '@/components/airmail/AirmailBorder';
import { Postmark } from '@/components/airmail/Postmark';
import { EmptyStampSlot } from '@/components/StateViews';
import { TripScene } from './TripScene';
import { DestinationStamp, SceneStamp } from './SceneStamp';
import { DESTINATION_ART } from './destinationArt';
import {
  DESTINATION_INFO,
  daysUntilLabelUppercase,
  formatTripRange,
  matchDestination,
  otherMembersWording,
  tripDays,
} from './destinations';
import { spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';
import { useAuth } from '@/features/auth/AuthContext';
import type { TripListItem } from './hooks';

interface TripCardProps {
  trip: TripListItem;
  variant: 'onNow' | 'upcoming' | 'past';
  onPress: () => void;
  /** Pause the on-now scene while the card is off-screen. */
  paused?: boolean;
}

/** Trip list card: on-now postcard, upcoming envelope, or postmarked past row. */
export function TripCard({ trip, variant, onPress, paused = false }: TripCardProps) {
  const { colors } = useTheme();
  const { userId } = useAuth();
  // The on-now scene is measured so its art scales with the real card width
  // (web column / larger phones) instead of the 390 pt design width.
  const [onNowWidth, setOnNowWidth] = useState(352);
  const country = matchDestination(trip.destination);
  // "with …" names the *other* members, so a non-creator sees the creator's
  // name rather than their own.
  const wording = otherMembersWording(trip.memberProfiles, userId);
  const range = formatTripRange(trip.startDate, trip.endDate);

  if (variant === 'past') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${trip.name}, past trip`}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={[styles.pastRow, { backgroundColor: colors.paper }]}>
          <View style={styles.pastStamp}>
            {country ? (
              <>
                <SceneStamp
                  band="mini"
                  image={DESTINATION_ART[country].sceneStampStill}
                  denomination={null}
                  name={null}
                />
                <Postmark
                  variant="compact"
                  style={styles.compactPostmark}
                  city={DESTINATION_INFO[country].chip}
                  date={trip.endDate}
                />
              </>
            ) : (
              <SceneStamp band="mini" image={null} initial={initial(trip.name)} />
            )}
          </View>
          <View style={styles.pastText}>
            <AppText role="rowTitleLg" numberOfLines={1}>
              {trip.name}
            </AppText>
            <AppText role="metaSm" tone="secondary" style={styles.pastMeta}>
              {[wording, `${monthYear(trip)}`].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'onNow') {
    const days = tripDays(trip.startDate, trip.endDate);
    const dayOf = dayNumber(trip.startDate);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={trip.name}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <AirmailBorder padding={5} innerRadius={2}>
          <View
            style={styles.onNowArt}
            onLayout={(e) => setOnNowWidth(e.nativeEvent.layout.width)}
          >
            <TripScene
              country={country}
              coverImagePath={trip.coverImagePath}
              crop="card"
              width={onNowWidth}
              height={112}
              live
              paused={paused}
            />
            <View style={[styles.onNowChip, { backgroundColor: colors.paper }]}>
              <AppText role="kicker" style={styles.onNowChipText}>ON NOW · DAY {dayOf} OF {days}</AppText>
            </View>
          </View>
          <View style={styles.onNowBody}>
            <AppText role="cardTitle" numberOfLines={1} style={styles.cardName}>
              {trip.name}
            </AppText>
            <AppText role="meta" tone="secondary" style={styles.metaLine}>
              {[wording, range].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </AirmailBorder>
      </Pressable>
    );
  }

  const days = tripDays(trip.startDate, trip.endDate);
  const countdown = trip.startDate
    ? daysUntilLabelUppercase(trip.startDate, toDateOnly(new Date()))
    : null;
  const noDates = !countdown;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={trip.name}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={[styles.upcoming, { backgroundColor: colors.paper }]}>
        <View style={styles.upcomingText}>
          <AppText role="kicker" tone={noDates ? 'muted' : 'primary'}>
            {countdown ?? 'NO DATES YET'}
          </AppText>
          <AppText role="cardTitle" numberOfLines={1} style={styles.upcomingTitle}>
            {trip.name}
          </AppText>
          <AppText role="meta" tone="secondary" style={styles.metaLine}>
            {[wording, range].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <View style={styles.upcomingStamp}>
          {noDates ? (
            <EmptyStampSlot width={56} height={72} />
          ) : country ? (
            <DestinationStamp country={country} band="xs" days={days} />
          ) : (
            <SceneStamp band="xs" image={null} initial={initial(trip.name)} name={trip.destination ?? undefined} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

function dayNumber(startDate: string | null): number {
  if (!startDate) return 1;
  const [y, m, d] = startDate.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d);
  const today = new Date();
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(1, Math.round((now - start) / 86_400_000) + 1);
}

function monthYear(trip: TripListItem): string {
  const date = trip.endDate ?? trip.startDate;
  if (!date) return 'No dates yet';
  const [y, m] = date.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${y}`;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  onNowArt: { height: 112, borderRadius: 2, overflow: 'hidden' },
  onNowChip: { position: 'absolute', left: 10, bottom: 10, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 2 },
  onNowChipText: { letterSpacing: 0.6 },
  onNowBody: { paddingTop: 11, paddingBottom: 13, paddingLeft: 15, paddingRight: 14 },
  metaLine: { marginTop: 2 },
  upcoming: {
    borderRadius: 4,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 16,
    paddingRight: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s5,
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  upcomingText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 21, lineHeight: 26 },
  upcomingTitle: { marginTop: 6, fontSize: 21, lineHeight: 26 },
  upcomingStamp: { flexShrink: 0 },
  pastRow: {
    borderRadius: 4,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(21,34,59,0.12)',
  },
  pastStamp: { width: 40, height: 48, position: 'relative' },
  compactPostmark: { position: 'absolute', left: 10, top: 2, opacity: 0.85 },
  pastText: { flex: 1, minWidth: 0, marginLeft: 36 },
  pastMeta: { marginTop: 2 },
});