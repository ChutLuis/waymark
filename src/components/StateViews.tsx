import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from './AppText';
import { Button } from './Button';
import { fontFamilies, spacing, useTheme } from '@/theme';

/** Restrained route mark used by empty states. */
export function RouteMark() {
  const { colors } = useTheme();
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Path
        d="M8 40c8-4 8-14 16-18s16-2 16-2"
        fill="none"
        stroke={colors.text.faint}
        strokeWidth={1.6}
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <Circle cx={8} cy={40} r={3.5} fill={colors.accent.base} />
      <Circle cx={40} cy={20} r={4} fill="none" stroke={colors.accent.base} strokeWidth={1.6} />
    </Svg>
  );
}

function AlertMark() {
  const { colors } = useTheme();
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24">
      <Circle
        cx={12}
        cy={12}
        r={9}
        fill="none"
        stroke={colors.semantic.danger.base}
        strokeWidth={1.4}
      />
      <Path
        d="M12 8v5M12 16.5v.5"
        fill="none"
        stroke={colors.semantic.danger.base}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StateShell({ children }: { children: ReactNode }) {
  return <View style={styles.shell}>{children}</View>;
}

export function LoadingState({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <StateShell>
      <ActivityIndicator accessibilityLabel={message ?? 'Loading'} color={colors.accent.base} />
      {message ? (
        <AppText tone="muted" style={styles.loadingMessage}>
          {message}
        </AppText>
      ) : null}
    </StateShell>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  mark?: ReactNode;
  /** Extra content under the primary action (e.g. a quiet secondary action). */
  children?: ReactNode;
}

export function EmptyState({ title, body, actionLabel, onAction, mark, children }: EmptyStateProps) {
  return (
    <StateShell>
      {mark ?? <RouteMark />}
      <AppText style={styles.title}>{title}</AppText>
      <AppText tone="secondary" style={styles.body}>
        {body}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
      {children}
    </StateShell>
  );
}

interface ErrorStateProps {
  title: string;
  body?: string;
  onRetry: () => void;
}

export function ErrorState({
  title,
  body = "Check your connection and try again — nothing was lost.",
  onRetry,
}: ErrorStateProps) {
  return (
    <StateShell>
      <AlertMark />
      <AppText style={[styles.title, styles.titleError]}>{title}</AppText>
      <AppText tone="secondary" style={styles.body}>
        {body}
      </AppText>
      <Button label="Try again" onPress={onRetry} variant="secondary" style={styles.action} />
    </StateShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingHorizontal: spacing.s8,
    paddingBottom: spacing.s9 * 2,
  },
  title: {
    fontFamily: fontFamilies.displayRegular,
    fontSize: 24,
    lineHeight: 30,
    marginTop: spacing.s4,
    textAlign: 'center',
  },
  titleError: {
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.s2,
    textAlign: 'center',
  },
  loadingMessage: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: spacing.s4,
  },
  action: {
    marginTop: spacing.s5,
  },
});
