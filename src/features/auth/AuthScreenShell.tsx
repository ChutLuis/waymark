import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BrandMark } from '@/components/BrandMark';
import { spacing, useTheme } from '@/theme';

interface AuthScreenShellProps {
  title: string;
  subtitle: string;
  /** Uppercase kicker shown instead of the brand mark (onboarding/join). */
  kicker?: string;
  children: ReactNode;
  /** Pinned under the scroll content (e.g. onboarding Continue). */
  footer?: ReactNode;
}

/** Shared chrome for auth-flow screens; centered 440px column on web. */
export function AuthScreenShell({ title, subtitle, kicker, children, footer }: AuthScreenShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.surface.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.s9 + spacing.s7 },
          isWide && styles.contentWide,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {kicker ? (
          <AppText role="kicker" tone="accent">
            {kicker}
          </AppText>
        ) : (
          <View style={styles.mark}>
            <BrandMark />
          </View>
        )}
        <AppText role="display" style={kicker ? styles.titleAfterKicker : undefined}>
          {title}
        </AppText>
        <AppText tone="secondary" style={styles.subtitle}>
          {subtitle}
        </AppText>
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.s5) + spacing.s5 },
            isWide && styles.contentWide,
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.s6,
    paddingBottom: spacing.s8,
  },
  contentWide: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  mark: {
    marginBottom: spacing.s5,
  },
  titleAfterKicker: {
    marginTop: spacing.s2,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.s1 + 2,
  },
  body: {
    marginTop: spacing.s7,
    gap: spacing.s4,
  },
  footer: {
    paddingHorizontal: spacing.s6,
  },
});
