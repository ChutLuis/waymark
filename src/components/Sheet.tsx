import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLazyAnimatedValue } from './useLazyAnimatedValue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useReducedMotion } from './useReducedMotion';
import { hitTargetMin, motion, radius, shadows, spacing, useTheme } from '@/theme';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Right-side header action, e.g. Save / Add / Create. */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  children: ReactNode;
}

/**
 * Bottom sheet used for all create/edit forms. On wide (web) layouts it
 * becomes a centered modal card per the design's web adaptation note.
 */
export function Sheet({
  visible,
  title,
  onClose,
  actionLabel,
  onAction,
  actionDisabled = false,
  children,
}: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const isWide = width >= 720;

  const progress = useLazyAnimatedValue(0);
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reducedMotion ? motion.duration.fast : motion.duration.base,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!visible && finished) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, progress, reducedMotion]);

  if (!mounted) return null;

  const translateY = reducedMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: progress }]}
      >
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.host, isWide && styles.hostWide]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.bg,
              paddingBottom: isWide ? spacing.s11 : Math.max(insets.bottom, spacing.s11) + spacing.s7,
              opacity: progress,
              transform: [{ translateY }],
            },
            isWide ? styles.cardWide : styles.cardSheet,
          ]}
        >
          {!isWide && <View style={[styles.grabber, { backgroundColor: colors.border }]} />}
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}
            >
              <AppText role="button">{'Cancel'}</AppText>
            </Pressable>
            <AppText role="button">{title}</AppText>
            {actionLabel && onAction ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
                accessibilityState={{ disabled: actionDisabled }}
                disabled={actionDisabled}
                onPress={onAction}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerAction,
                  { backgroundColor: actionDisabled ? colors.border : colors.ink },
                  pressed && styles.pressed,
                ]}
              >
                <AppText role="bodySm" style={{ color: colors.paper }}>
                  {actionLabel}
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.headerSide} />
            )}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  hostWide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    paddingTop: spacing.s3,
    paddingHorizontal: spacing.s6,
    maxHeight: '92%',
  },
  cardSheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  cardWide: {
    width: 480,
    maxWidth: '92%',
    borderRadius: radius.sheet,
    boxShadow: shadows.cardRaised,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: spacing.s2,
    marginBottom: spacing.s3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    gap: spacing.s3,
  },
  headerSide: {
    minWidth: 56,
    minHeight: hitTargetMin,
    justifyContent: 'center',
  },
  headerAction: {
    minHeight: 44,
    paddingHorizontal: spacing.s9,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: spacing.s6,
    paddingTop: spacing.s3,
  },
  pressed: {
    opacity: 0.7,
  },
});