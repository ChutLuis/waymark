import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
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
                color: colors.paper,
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