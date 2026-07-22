import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { SectionLabel } from '@/components/SectionLabel';
import {
  fontFamilies,
  hairlineWidth,
  hitTargetMin,
  iconStrokeWidth,
  spacing,
  useTheme,
} from '@/theme';
import { formatDateRange } from '@/lib/format/date';
import type { Trip, TripMember } from '@/lib/types';

export type TripTab = 'itinerary' | 'packing' | 'notes';

const TABS: { key: TripTab; label: string }[] = [
  { key: 'itinerary', label: 'Itinerary' },
  { key: 'packing', label: 'Packing' },
  { key: 'notes', label: 'Notes' },
];

interface TripHeaderProps {
  trip: Trip;
  members: TripMember[];
  activeTab: TripTab;
}

/**
 * The trip detail masthead: date kicker, trip name, destination, member
 * avatars, settings, and the tab row. Shared by all three tabs so a
 * failing pane never takes the header down with it.
 */
export function TripHeader({ trip, members, activeTab }: TripHeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const dates = formatDateRange(trip.startDate, trip.endDate);

  const goToTab = (tab: TripTab) => {
    if (tab === activeTab) return;
    const base = `/trips/${trip.id}`;
    router.replace((tab === 'itinerary' ? base : `${base}/${tab}`) as never);
  };

  return (
    <View style={styles.container}>
      {dates ? <SectionLabel tone="accent">{dates}</SectionLabel> : null}
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <AppText role="title" numberOfLines={2}>
            {trip.name}
          </AppText>
          {trip.destination ? (
            <AppText tone="secondary" style={styles.destination}>
              {trip.destination}
            </AppText>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <AvatarStack
            profiles={members.map((m) => m.profile)}
            surfaceColor={colors.surface.bg}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trip settings"
            hitSlop={10}
            onPress={() => router.push(`/trips/${trip.id}/settings` as never)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Settings size={21} color={colors.text.secondary} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>
      </View>
      <View
        accessibilityRole="tablist"
        style={[styles.tabRow, { borderBottomColor: colors.hairline.default }]}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => goToTab(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                active && { borderBottomColor: colors.accent.base },
                pressed && !active && styles.pressed,
              ]}
            >
              <AppText
                tone={active ? 'primary' : 'muted'}
                style={[styles.tabLabel, active && { fontFamily: fontFamilies.textSemiBold }]}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenGutter,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.s3,
    marginTop: spacing.s1,
  },
  titleBlock: {
    flexShrink: 1,
  },
  destination: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingBottom: 2,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.s6,
    marginTop: spacing.s5,
    borderBottomWidth: hairlineWidth,
  },
  tab: {
    paddingVertical: 9,
    marginBottom: -hairlineWidth,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: hitTargetMin - 4,
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.7,
  },
});
