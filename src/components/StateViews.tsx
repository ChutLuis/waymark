import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from './AppText';
import { Button } from './Button';
import { spacing, useTheme } from '@/theme';

/** 56x72 dashed empty stamp slot, the mark used by trip empty states. */
export function EmptyStampSlot({ width = 56, height = 72 }: { width?: number; height?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={width} height={height} viewBox="0 0 56 72" accessibilityLabel="No stamp yet">
      <Path
        d="M2 2h52v68H2z"
        fill="none"
        stroke={colors.slot}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
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
        stroke={colors.wax}
        strokeWidth={1.6}
      />
      <Path d="M12 8v5M12 16.5v.5" fill="none" stroke={colors.wax} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function StateShell({ children, placement = 'center' }: { children: ReactNode; placement?: 'center' | 'top' }) {
  return <View style={[styles.shell, placement === 'top' && styles.shellTop]}>{children}</View>;
}

export function LoadingState({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <StateShell>
      <ActivityIndicator accessibilityLabel={message ?? 'Loading'} color={colors.ink2} />
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
  /** Trip tabs share a fixed top gap instead of filling the remaining space. */
  placement?: 'center' | 'top';
  /** Extra content under the primary action (e.g. a quiet secondary action). */
  children?: ReactNode;
}

export function EmptyState({ title, body, actionLabel, onAction, mark, children, placement }: EmptyStateProps) {
  return (
    <StateShell placement={placement}>
      {mark ?? <EmptyStampSlot />}
      <AppText role="cardTitle" style={styles.title}>
        {title}
      </AppText>
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
      <AppText role="cardTitle" style={[styles.title, styles.titleError]}>
        {title}
      </AppText>
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
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  title: {
    marginTop: spacing.s7,
    textAlign: 'center',
  },
  shellTop: {
    flex: 0,
    justifyContent: 'flex-start',
    paddingTop: spacing.s7,
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
    marginTop: spacing.s7,
  },
  action: {
    marginTop: spacing.s9,
  },
});
