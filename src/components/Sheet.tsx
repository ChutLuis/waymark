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
import {
  fontFamilies,
  hairlineWidth,
  hitTargetMin,
  motion,
  radius,
  spacing,
  useTheme,
} from '@/theme';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Right-side header action, e.g. Save / Add. */
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
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.scrim, opacity: progress }]}
      >
        <Pressable
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
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
              backgroundColor: colors.surface.raised,
              borderColor: colors.hairline.default,
              paddingBottom: isWide ? spacing.s6 : Math.max(insets.bottom, spacing.s6) + spacing.s4,
              opacity: progress,
              transform: [{ translateY }],
            },
            isWide ? styles.cardWide : styles.cardSheet,
          ]}
        >
          {!isWide && (
            <View style={[styles.grabber, { backgroundColor: colors.hairline.strong }]} />
          )}
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
            >
              <AppText role="label" tone="muted">
                Cancel
              </AppText>
            </Pressable>
            <AppText
              style={{ fontFamily: fontFamilies.displayMedium, fontSize: 19, lineHeight: 26 }}
            >
              {title}
            </AppText>
            {actionLabel && onAction ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
                accessibilityState={{ disabled: actionDisabled }}
                disabled={actionDisabled}
                onPress={onAction}
                hitSlop={12}
                style={({ pressed }) => [styles.headerAction, styles.headerActionEnd, pressed && styles.pressed]}
              >
                <AppText role="label" tone={actionDisabled ? 'faint' : 'accent'}>
                  {actionLabel}
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.headerAction} />
            )}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.s3 + 1 }}
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
    paddingTop: spacing.s2 + 2,
    paddingHorizontal: spacing.screenGutter,
    borderWidth: hairlineWidth,
    maxHeight: '88%',
  },
  cardSheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderBottomWidth: 0,
  },
  cardWide: {
    width: 480,
    maxWidth: '92%',
    borderRadius: radius.sheet,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.s3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s4 + 2,
  },
  headerAction: {
    minWidth: 56,
    minHeight: hitTargetMin - 16,
    justifyContent: 'center',
  },
  headerActionEnd: {
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
});
