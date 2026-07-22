import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { fontFamilies, spacing, useTheme } from '@/theme';
import { formatInviteCode, inviteLink, useTripInvite } from './hooks';

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function InviteCard({ tripId }: { tripId: string }) {
  const { colors } = useTheme();
  const invite = useTripInvite(tripId);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const onShare = async () => {
    if (!invite.data) return;
    const message = `Join my trip on Waymark: ${inviteLink(invite.data.code)}`;
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: message });
        else await Clipboard.setStringAsync(message);
      } else {
        await Share.share({ message });
      }
    } catch {
      // Share sheet dismissed; nothing to do.
    }
  };

  const onCopy = async () => {
    if (!invite.data) return;
    await Clipboard.setStringAsync(invite.data.code);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card padded>
      {invite.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent.base} accessibilityLabel="Creating invite" />
        </View>
      ) : invite.isError ? (
        <View style={styles.loading}>
          <AppText role="caption" tone="muted" style={styles.expiry}>
            Couldn&apos;t create an invite.
          </AppText>
          <Button label="Try again" variant="quiet" onPress={() => invite.refetch()} />
        </View>
      ) : (
        <>
          <AppText
            accessibilityLabel={`Invite code ${invite.data.code.split('').join(' ')}`}
            style={[styles.code, { fontFamily: fontFamilies.mono }]}
          >
            {formatInviteCode(invite.data.code)}
          </AppText>
          <AppText role="caption" tone="muted" style={styles.expiry}>
            Expires in {daysUntil(invite.data.expiresAt)} days · one person can use it
          </AppText>
          <View style={styles.buttonRow}>
            <View style={styles.buttonCol}>
              <Button label="Share link" onPress={onShare} style={styles.button} />
            </View>
            <View style={styles.buttonCol}>
              <Button
                label={copied ? 'Copied' : 'Copy code'}
                variant="secondary"
                onPress={onCopy}
                style={styles.button}
              />
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.s4,
    gap: spacing.s2,
  },
  code: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  expiry: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.s1 + 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.s2 + 2,
    marginTop: spacing.s3 + 2,
  },
  buttonCol: {
    flex: 1,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: spacing.s2,
  },
});
