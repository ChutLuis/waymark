import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/components/useReducedMotion';
import { useLazyAnimatedValue } from '@/components/useLazyAnimatedValue';
import { radius, spacing, useTheme } from '@/theme';

/** Pulsing placeholder card (opacity 0.6→1; static under reduced motion). */
export function TripCardSkeleton({ withCover = false }: { withCover?: boolean }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pulse = useLazyAnimatedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);

  const block = { backgroundColor: colors.artPlaceholder };

  return (
    <Animated.View style={{ opacity: pulse }} accessibilityLabel="Loading trip">
      <View style={[styles.card, { backgroundColor: colors.paper }]}>
        {withCover ? (
          <View style={[styles.cover, block]} />
        ) : (
          <View style={styles.row}>
            <View style={styles.body}>
              <View style={[styles.titleBlock, block]} />
              <View style={[styles.metaBlock, block]} />
            </View>
            <View style={[styles.stampBlock, block]} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  cover: { height: 112, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.s6 + 1, gap: spacing.s5 },
  body: { flex: 1 },
  titleBlock: { width: '60%', height: 20, borderRadius: radius.chip },
  metaBlock: { width: '42%', height: 12, borderRadius: radius.chip, marginTop: spacing.s3 },
  stampBlock: { width: 56, height: 72, borderRadius: 2 },
});