import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useAppActive } from '@/components/useAppActive';
import { useReducedMotion } from '@/components/useReducedMotion';
import { useLazyAnimatedValue } from '@/components/useLazyAnimatedValue';
import { motion, radius, shadows, spacing, useTheme } from '@/theme';

/** Pulsing placeholder card (opacity 0.6→1; static under reduced motion). */
export function TripCardSkeleton({ withCover = false }: { withCover?: boolean }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const pulse = useLazyAnimatedValue(1);

  useEffect(() => {
    if (reducedMotion || !focused || !appActive) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: motion.duration.shuffle,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.duration.shuffle,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion, focused, appActive]);

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
    borderRadius: radius.card,
    overflow: 'hidden',
    boxShadow: shadows.card,
  },
  cover: { height: 112, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.s6 + 1, gap: spacing.s5 },
  body: { flex: 1 },
  titleBlock: { width: '60%', height: 20, borderRadius: radius.chip },
  metaBlock: { width: '42%', height: 12, borderRadius: radius.chip, marginTop: spacing.s3 },
  stampBlock: { width: 56, height: 72, borderRadius: 2 },
});
