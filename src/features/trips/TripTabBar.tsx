import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Mail } from 'lucide-react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { easing, useMotion } from '@/components/motion';
import { haptic } from '@/lib/haptics';
import { fontFamilies, iconStrokeWidth, motion, radius, shadows, useTheme } from '@/theme';
import { SHELL } from './shellLayout';

export type TripTab = 'plan' | 'packing' | 'notes';

const TABS: { key: TripTab; label: string; segment: string }[] = [
  { key: 'plan', label: 'Plan', segment: '' },
  { key: 'packing', label: 'Packing', segment: 'packing' },
  { key: 'notes', label: 'Notes', segment: 'notes' },
];

const ICON = 20;
/** The indicator pill is inset 8 pt inside each third of the stub. */
const INDICATOR_INSET = 8;
const INDICATOR_HEIGHT = 44;
/** Ticket-stub notches at each tear line, top and bottom. */
const NOTCH = 5;
const DIVIDER_INSET = 12;

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
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24">
      <Rect x={5} y={7} width={14} height={13} rx={2} {...stroke} />
      <Path d="M9 7V4h6v3" {...stroke} />
      <Path d="M9 11v5M15 11v5" {...stroke} />
    </Svg>
  );
}

function tabIcon(key: TripTab, color: string) {
  switch (key) {
    case 'plan':
      return <Calendar size={ICON} color={color} strokeWidth={iconStrokeWidth} />;
    case 'packing':
      return <SuitcaseIcon color={color} />;
    case 'notes':
      return <Mail size={ICON} color={color} strokeWidth={iconStrokeWidth} />;
  }
}

/** The stub's outline: a rounded rect with half-circle notches at the tears. */
function stubPath(w: number, h: number): string {
  const r = radius.brandOuter;
  const a = w / 3;
  const b = (2 * w) / 3;
  return [
    `M${r} 0`,
    `L${a - NOTCH} 0 A${NOTCH} ${NOTCH} 0 0 0 ${a + NOTCH} 0`,
    `L${b - NOTCH} 0 A${NOTCH} ${NOTCH} 0 0 0 ${b + NOTCH} 0`,
    `L${w - r} 0 Q${w} 0 ${w} ${r}`,
    `L${w} ${h - r} Q${w} ${h} ${w - r} ${h}`,
    `L${b + NOTCH} ${h} A${NOTCH} ${NOTCH} 0 0 0 ${b - NOTCH} ${h}`,
    `L${a + NOTCH} ${h} A${NOTCH} ${NOTCH} 0 0 0 ${a - NOTCH} ${h}`,
    `L${r} ${h} Q0 ${h} 0 ${h - r}`,
    `L0 ${r} Q0 0 ${r} 0 Z`,
  ].join(' ');
}

/**
 * The trip shell's floating ticket stub (Airmail v4 · Shared): three tabs torn
 * apart by dotted lines, with a bg-coloured pill that springs to the active
 * tab (440 ms, `indicator` easing). The Trip page opens from the title pill.
 */
export function TripTabBar({
  tripId,
  active,
  style,
}: {
  tripId: string;
  active: TripTab;
  style?: object;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ms } = useMotion();
  const [width, setWidth] = useState(0);

  const index = TABS.findIndex((t) => t.key === active);
  const third = width / 3;
  const left = useSharedValue(INDICATOR_INSET + index * third);

  // The first measurement places the pill; later tab changes slide it.
  const placed = useRef(false);
  useEffect(() => {
    if (width === 0) return;
    if (!placed.current) {
      placed.current = true;
      left.value = INDICATOR_INSET + index * third;
      return;
    }
    left.value = withTiming(INDICATOR_INSET + index * third, {
      duration: ms(motion.choreo.shell.indicator),
      easing: easing('indicator'),
    });
  }, [index, third, width, left, ms]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: left.value }] }));

  const go = (tab: TripTab) => {
    if (tab === active) return;
    haptic('selection');
    const base = `/trips/${tripId}`;
    const segment = TABS.find((t) => t.key === tab)?.segment;
    router.replace((segment ? `${base}/${segment}` : base) as never);
  };

  const bottom = Math.max(insets.bottom - SHELL.tabBarLift, SHELL.tabBarMinBottom);

  return (
    <View
      testID="trip-tab-bar"
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.bar, { bottom, boxShadow: shadows.ticketStub }, style]}
    >
      {width > 0 ? (
        <Svg width={width} height={SHELL.tabBarHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={stubPath(width, SHELL.tabBarHeight)} fill={colors.paper} />
          {[third, 2 * third].map((x) => (
            <Line
              key={x}
              x1={x}
              y1={DIVIDER_INSET}
              x2={x}
              y2={SHELL.tabBarHeight - DIVIDER_INSET}
              stroke={colors.ruleWarm}
              strokeWidth={1.5}
              strokeDasharray="1.5 2.5"
            />
          ))}
        </Svg>
      ) : null}
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { width: third - 2 * INDICATOR_INSET, backgroundColor: colors.bg },
            indicatorStyle,
          ]}
        />
      ) : null}
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const tone = selected ? colors.ink : colors.ink2;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => go(tab.key)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            {tabIcon(tab.key, tone)}
            <AppText
              role="tabLabel"
              style={{ color: tone, fontFamily: selected ? fontFamilies.bold : fontFamilies.semibold }}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: SHELL.tabBarInset,
    right: SHELL.tabBarInset,
    height: SHELL.tabBarHeight,
    borderRadius: radius.brandOuter,
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: (SHELL.tabBarHeight - INDICATOR_HEIGHT) / 2,
    height: INDICATOR_HEIGHT,
    borderRadius: radius.codeBox,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
