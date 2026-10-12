import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { fontFamilies, radius, shadows, useTheme } from '@/theme';

interface WaxSealProps {
  /** Author's initial; omitted for the small sign-up seal. */
  initial?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The wax seal that closes a private-note envelope: a wax disc with a single
 * `waxRing` band at the outer edge and a cream ring just inside it.
 */
export function WaxSeal({ initial, size = 34, style }: WaxSealProps) {
  const { colors } = useTheme();
  // The small sign-up seal has no initial and a thinner band.
  const band = size <= 28 ? size * 0.1 : 3;
  const creamInset = band + 1;
  return (
    <View style={[styles.sealHost, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={colors.wax} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - band}
          fill="none"
          stroke={colors.waxRing}
          strokeWidth={band}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - creamInset}
          fill="none"
          stroke="rgba(255,252,245,0.35)"
          strokeWidth={1}
        />
      </Svg>
      {initial ? (
        <View style={[StyleSheet.absoluteFill, styles.initialWrap]} pointerEvents="none">
          <Text
            style={[
              styles.initial,
              {
                // Fixed cream: the wax is red in both themes, so the initial
                // must stay light (the theme paper turns navy in dark mode).
                color: '#FFFCF5',
                fontFamily: fontFamilies.bold,
                fontSize: size <= 28 ? 12 : 15,
                lineHeight: size <= 28 ? 15 : 18,
                includeFontPadding: false,
              },
            ]}
          >
            {initial}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface KraftEnvelopeProps {
  children: ReactNode;
  /** Flap height: 32 (full) or 24 (sign-up). */
  flapHeight?: number;
  style?: StyleProp<ViewStyle>;
}

/** A sealed private-note envelope: kraft paper with a downward flap. */
export function KraftEnvelope({ children, flapHeight = 32, style }: KraftEnvelopeProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.envelope, { backgroundColor: colors.kraft, boxShadow: shadows.card }, style]}>
      <Svg
        width="100%"
        height={flapHeight}
        viewBox={`0 0 100 ${flapHeight}`}
        preserveAspectRatio="none"
        style={styles.flap}
      >
        <Path d={`M0 0 L100 0 L50 ${flapHeight} Z`} fill={colors.kraftFlap} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  envelope: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  flap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sealHost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    textAlign: 'center',
  },
});
/** The prototype's jagged seam, as fractions of the disc (x, y). */
const SEAM: [number, number][] = [
  [0.53, 0],
  [0.47, 0.2],
  [0.57, 0.42],
  [0.45, 0.62],
  [0.55, 0.8],
  [0.49, 1],
];

function halfPolygon(side: 'left' | 'right', size: number): string {
  const seam = SEAM.map(([x, y]) => `${x * size},${y * size}`);
  return side === 'left'
    ? [`0,0`, ...seam, `0,${size}`].join(' ')
    : [`${size},0`, `${size},${size}`, ...[...seam].reverse()].join(' ');
}

/**
 * One half of the private note's wax seal (Airmail v4 · 06): a wax disc lit
 * from the upper left, clipped along a jagged vertical seam, with the
 * author's initial spanning both halves.
 */
export function WaxSealHalf({ side, initial, size = 42 }: { side: 'left' | 'right'; initial: string; size?: number }) {
  const { colors } = useTheme();
  const id = `wax-${side}`;
  const ring = 3;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <ClipPath id={`${id}-clip`}>
          <Polygon points={halfPolygon(side, size)} />
        </ClipPath>
        <RadialGradient id={`${id}-fill`} cx="38%" cy="34%" r="70%">
          <Stop offset="0.3" stopColor={colors.waxLight} />
          <Stop offset="1" stopColor={colors.wax} />
        </RadialGradient>
      </Defs>
      <G clipPath={`url(#${id}-clip)`}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id}-fill)`} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - ring / 2}
          fill="none"
          stroke={colors.waxRing}
          strokeOpacity={0.9}
          strokeWidth={ring}
        />
        <SvgText
          x={size / 2}
          y={size / 2 + 6}
          textAnchor="middle"
          fill={colors.waxText}
          fontFamily={fontFamilies.extrabold}
          fontSize={17}
        >
          {initial}
        </SvgText>
      </G>
    </Svg>
  );
}
