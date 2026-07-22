import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { fontFamilies, spacing, useTheme } from '@/theme';
import { formatDateRange, toDateOnly } from '@/lib/format/date';
import { daysUntilLabel } from './sort';
import type { TripListItem } from './hooks';
import { TripCoverImage } from './TripCoverImage';

interface TripCardProps {
  trip: TripListItem;
  isPast?: boolean;
  onPress: () => void;
}

export function TripCard({ trip, isPast = false, onPress }: TripCardProps) {
  const { colors } = useTheme();

  const metaParts: string[] = [];
  if (trip.destination) metaParts.push(trip.destination);
  const dates = formatDateRange(trip.startDate, trip.endDate);
  if (dates) metaParts.push(dates);
  else metaParts.push('dates not set');
  if (!isPast && trip.startDate) {
    const countdown = daysUntilLabel(trip.startDate, toDateOnly(new Date()));
    if (countdown) metaParts.push(countdown);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}${isPast ? ', past trip' : ''}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card surface={isPast ? 'flat' : 'raised'} style={styles.card}>
        {!isPast && trip.coverImagePath ? (
          <TripCoverImage tripId={trip.id} path={trip.coverImagePath} />
        ) : null}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText
              tone={isPast ? 'muted' : 'primary'}
              numberOfLines={1}
              style={styles.title}
            >
              {trip.name}
            </AppText>
            {isPast ? (
              <AppText role="caption" tone="faint" style={styles.pastTag}>
                past
              </AppText>
            ) : (
              <AvatarStack
                profiles={trip.memberProfiles}
                size={26}
                surfaceColor={colors.surface.raised}
              />
            )}
          </View>
          <AppText role="caption" tone={isPast ? 'faint' : 'muted'} style={styles.meta}>
            {metaParts.join(' · ')}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  card: {
    overflow: 'hidden',
  },
  body: {
    paddingVertical: spacing.s3 + 2,
    paddingHorizontal: spacing.s4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.s3,
  },
  title: {
    fontFamily: fontFamilies.displayRegular,
    fontSize: 21,
    lineHeight: 27,
    flexShrink: 1,
  },
  pastTag: {
    fontSize: 12,
    lineHeight: 16,
  },
  meta: {
    marginTop: 3,
  },
});
