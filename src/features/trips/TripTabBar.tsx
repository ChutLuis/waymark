import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Mail } from 'lucide-react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { AirmailStripes } from '@/components/airmail/AirmailBorder';
import { fontFamilies, iconStrokeWidth, spacing, useTheme } from '@/theme';

export type TripTab = 'plan' | 'packing' | 'notes' | 'trip';

const TABS: { key: TripTab; label: string; segment: string }[] = [
  { key: 'plan', label: 'Plan', segment: '' },
  { key: 'packing', label: 'Packing', segment: 'packing' },
  { key: 'notes', label: 'Notes', segment: 'notes' },
  { key: 'trip', label: 'Trip', segment: 'settings' },
];

/** The custom stamp icon used for the Trip tab (README: Icons, 24 grid). */
function StampIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect
        x={4}
        y={2.5}
        width={16}
        height={19}
        fill="none"
        stroke={color}
        strokeWidth={iconStrokeWidth}
        strokeDasharray="2 2.2"
      />
      <Rect x={8} y={6.5} width={8} height={8} fill="none" stroke={color} strokeWidth={iconStrokeWidth} />
      <Line
        x1={8}
        y1={18}
        x2={16}
        y2={18}
        stroke={color}
        strokeWidth={iconStrokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** The design's suitcase for the Packing tab: no wheels, unlike Lucide's Luggage. */
function SuitcaseIcon({ color }: { color: string }) {
  const stroke = {
    fill: 'none',
    stroke: color,
    strokeWidth: iconStrokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={5} y={7} width={14} height={13} rx={2} {...stroke} />
      <Path d="M9 7V4h6v3" {...stroke} />
      <Path d="M9 11v5M15 11v5" {...stroke} />
    </Svg>
  );
}

function tabIcon(key: TripTab, color: string) {
  switch (key) {
    case 'plan':
      return <Calendar size={22} color={color} strokeWidth={iconStrokeWidth} />;
    case 'packing':
      return <SuitcaseIcon color={color} />;
    case 'notes':
      return <Mail size={22} color={color} strokeWidth={iconStrokeWidth} />;
    case 'trip':
      return <StampIcon color={color} />;
  }
}

/** Bottom tab bar for the trip shell. "Trip" is the old settings screen. */
export function TripTabBar({ tripId, active }: { tripId: string; active: TripTab }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const go = (tab: TripTab) => {
    if (tab === active) return;
    const base = `/trips/${tripId}`;
    const target = tab === 'plan' ? base : `${base}/${TABS.find((t) => t.key === tab)?.segment}`;
    router.replace(target as never);
  };

  return (
    <View
      testID="trip-tab-bar"
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors.paper,
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
        },
      ]}
    >
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => go(tab.key)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            {selected ? (
              <View style={[styles.indicator, { backgroundColor: colors.airmailRed }]}>
                <AirmailStripes size="tab" />
              </View>
            ) : null}
            <View style={styles.itemInner}>
              {tabIcon(tab.key, selected ? colors.ink : colors.ink3)}
              <AppText
                role="tab"
                style={{
                  color: selected ? colors.ink : colors.ink3,
                  fontFamily: selected ? fontFamilies.bold : fontFamilies.semibold,
                }}
              >
                {tab.label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'stretch',
    // A little side inset so the end labels never touch the window edge (N16).
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    paddingBottom: spacing.s3,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 44,
    height: 5,
    overflow: 'hidden',
  },
  itemInner: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
