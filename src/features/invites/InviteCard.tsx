import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { AirmailBorder } from '@/components/airmail/AirmailBorder';
import { fontFamilies, spacing, useTheme } from '@/theme';
import { inviteLink, useTripInvite } from './hooks';

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

  if (invite.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} accessibilityLabel="Creating invite" />
      </View>
    );
  }
  if (invite.isError) {
    return (
      <View style={styles.loading}>
        <AppText role="bodySm" tone="muted">
          Couldn&apos;t create an invite.
        </AppText>
        <Button label="Try again" variant="quiet" size="sm" onPress={() => invite.refetch()} />
      </View>
    );
  }

  const shown = invite.data.code.slice(0, 4) + ' ' + invite.data.code.slice(4);

  return (
    <View>
      <AirmailBorder padding={6}>
        <View style={styles.inner}>
          <View style={styles.topRow}>
            <AppText role="kicker">INVITE CODE</AppText>
            <View style={[styles.parAvion, { backgroundColor: colors.airmailBlue }]}>
              <AppText role="tag" style={[styles.parAvionText, { color: colors.paper }]}>
                PAR AVION
              </AppText>
              <AppText role="tag" style={[styles.parAvionText, { color: colors.paper }]}>
                BY AIR MAIL
              </AppText>
            </View>
          </View>
          <AppText
            accessibilityLabel={`Invite code ${invite.data.code.split('').join(' ')}`}
            role="code"
            style={styles.code}
          >
            {shown}
          </AppText>
          <AppText role="bodySm" tone="secondary" style={styles.note}>
            Works once · expires in {daysUntil(invite.data.expiresAt)} days
          </AppText>
        </View>
      </AirmailBorder>
      <View style={styles.buttons}>
        <View style={styles.buttonCol}>
          <Button
            label="Share link"
            size="md"
            leading={<Share2 size={18} color={colors.paper} strokeWidth={2.2} />}
            onPress={onShare}
          />
        </View>
        <View style={styles.buttonCol}>
          <Button
            label={copied ? 'Copied' : 'Copy code'}
            variant="secondary"
            size="md"
            leading={<Copy size={18} color={colors.ink} strokeWidth={2.2} />}
            onPress={onCopy}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: spacing.s7, gap: spacing.s3 },
  inner: { paddingTop: 12, paddingBottom: 14, paddingLeft: 16, paddingRight: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  parAvion: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 2,
    alignItems: 'center',
  },
  parAvionText: { fontSize: 9, lineHeight: 11, letterSpacing: 0.6 },
  code: { marginTop: 4, fontFamily: fontFamilies.mono },
  note: { marginTop: 4 },
  buttons: { flexDirection: 'row', gap: spacing.s4, paddingTop: spacing.s5, paddingHorizontal: spacing.cardGutter },
  buttonCol: { flex: 1 },
});