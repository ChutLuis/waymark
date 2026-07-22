import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
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

  const block = { backgroundColor: colors.surface.sunken };

  return (
    <Animated.View style={{ opacity: pulse }} accessibilityLabel="Loading trip">
      <Card style={styles.card}>
        {withCover ? <View style={[styles.cover, block]} /> : null}
        <View style={styles.body}>
          <View style={[styles.titleBlock, block]} />
          <View style={[styles.metaBlock, block]} />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  cover: {
    height: 120,
    width: '100%',
  },
  body: {
    paddingVertical: spacing.s3 + 2,
    paddingHorizontal: spacing.s4,
  },
  titleBlock: {
    width: '60%',
    height: 18,
    borderRadius: radius.xs,
  },
  metaBlock: {
    width: '42%',
    height: 12,
    borderRadius: radius.xs,
    marginTop: spacing.s2,
  },
});
