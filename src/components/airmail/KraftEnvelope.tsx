import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '../AppText';
import { radius, shadows, useTheme } from '@/theme';

interface WaxSealProps {
  /** Author's initial; omitted for the small sign-up seal. */
  initial?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** The wax seal that closes a private-note envelope. */
export function WaxSeal({ initial, size = 34, style }: WaxSealProps) {
  const { colors } = useTheme();
  const ringStroke = size === 24 ? 2.5 : 2;
  return (
    <View style={[styles.sealHost, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={colors.wax} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - ringStroke}
          fill="none"
          stroke={colors.waxRing}
          strokeWidth={ringStroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - ringStroke * 2}
          fill="none"
          stroke={colors.waxRing}
          strokeWidth={ringStroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - ringStroke * 3}
          fill="none"
          stroke={colors.waxRing}
          strokeWidth={ringStroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - ringStroke * 4}
          fill="none"
          stroke="rgba(255,252,245,0.35)"
          strokeWidth={ringStroke}
        />
      </Svg>
      {initial ? (
        <View style={StyleSheet.absoluteFill}>
          <AppText role="link" style={[styles.initial, { color: colors.paper }]}>
            {initial}
          </AppText>
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
  initial: {
    textAlign: 'center',
    lineHeight: undefined,
  },
});