import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { radius, useTheme } from '@/theme';

/** Stripe geometry, measured across the stripes (README: AirmailBorder). */
export const AIRMAIL_STRIPES = {
  /** On-now trip card, Next card, invite card. */
  full: { period: 36, red: 12, paper1: 6, blue: 12, paper2: 6 },
  /** Tab-bar indicator (44x5). */
  tab: { period: 18, red: 6, paper1: 3, blue: 6, paper2: 3 },
  /** Brand mark. */
  brand: { period: 12, red: 4, paper1: 2, blue: 4, paper2: 2 },
} as const;

export type AirmailStripeSize = keyof typeof AIRMAIL_STRIPES;

interface AirmailStripesProps {
  size?: AirmailStripeSize;
  /** Fill colour of the paper gaps (defaults to the theme's paper). */
  gapColor?: string;
}

/**
 * The repeating airmail stripe as an SVG `Pattern`, rotated 45 degrees so the
 * bands run diagonally like the CSS `repeating-linear-gradient(135deg, …)`.
 */
export function AirmailStripes({ size = 'full', gapColor }: AirmailStripesProps) {
  const { colors } = useTheme();
  const s = AIRMAIL_STRIPES[size];
  const gap = gapColor ?? colors.paper;
  const id = `airmail-${size}`;
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern
          id={id}
          x="0"
          y="0"
          width={s.period}
          height={s.period}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <Rect x={0} y={0} width={s.red} height={s.period} fill={colors.airmailRed} />
          <Rect x={s.red} y={0} width={s.paper1} height={s.period} fill={gap} />
          <Rect
            x={s.red + s.paper1}
            y={0}
            width={s.blue}
            height={s.period}
            fill={colors.airmailBlue}
          />
          <Rect
            x={s.red + s.paper1 + s.blue}
            y={0}
            width={s.paper2}
            height={s.period}
            fill={gap}
          />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

interface AirmailBorderProps {
  children: ReactNode;
  /** Padding of the stripe frame: 5 for the on-now card, 6 for Next/invite. */
  padding?: number;
  /** Stripe band size. */
  size?: AirmailStripeSize;
  /** Radius of the paper content inside the frame. */
  innerRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Airmail stripe frame with paper content inset. The paper content supplies its
 * own background/children; the frame shows stripes around it.
 */
export function AirmailBorder({
  children,
  padding = 6,
  size = 'full',
  innerRadius = radius.airmailInner,
  style,
}: AirmailBorderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.outer, { padding, borderRadius: radius.airmailOuter }, style]}>
      <View style={StyleSheet.absoluteFill}>
        <AirmailStripes size={size} />
      </View>
      <View style={[styles.inner, { borderRadius: innerRadius, backgroundColor: colors.paper }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
  inner: {
    overflow: 'hidden',
  },
});