import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Check, Copy, Share as ShareIcon } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useLoop, useMotion } from '@/components/motion';
import { codeLength, typedCode } from '@/features/trips/sheet';
import { iconStrokeWidth, motion, radius, shadows, useTheme } from '@/theme';
import { inviteLink, useTripInvite } from './hooks';

const CARET = { width: 2, height: 18 } as const;
const BARCODE = { width: 150, height: 10 } as const;
/** The barcode's bar widths in points, repeating (2 on, 1 off, 1 on, 3 off, 3 on, 1 off). */
const BARS = [2, 1, 1, 3, 3, 1];

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function Barcode({ color }: { color: string }) {
  const bars: { x: number; w: number }[] = [];
  for (let x = 0, i = 0; x < BARCODE.width; i++) {
    const w = BARS[i % BARS.length];
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  }
  return (
    <View style={styles.barcode}>
      {bars.map((b) => (
        <View key={b.x} style={[styles.bar, { left: b.x, width: b.w, backgroundColor: color }]} />
      ))}
    </View>
  );
}

/**
 * The invite as registered mail (Airmail v4 · 05): an "R" box, the code typed
 * in one character every 70 ms behind a blinking caret, a barcode and the
 * expiry. Typing starts at d0 + 1500 and runs once per open; with reduced
 * motion the code appears in full at once.
 */
export function RegisteredInvite({ tripId }: { tripId: string }) {
  const { colors } = useTheme();
  const { reduced, ms } = useMotion();
  const invite = useTripInvite(tripId);
  const [typed, setTyped] = useState(0);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const code = invite.data?.code ?? '';
  const total = codeLength(code);
  const typing = !reduced && typed < total;
  const caret = useLoop(motion.choreo.sheet.caretBlink, typing && code.length > 0);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value < 0.5 ? 1 : 0 }));

  useEffect(() => {
    if (!code) return;
    if (reduced) {
      setTyped(total);
      return;
    }
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setTyped((n) => {
          if (n + 1 >= total && interval) clearInterval(interval);
          return Math.min(total, n + 1);
        });
      }, motion.duration.typeChar);
    }, ms(motion.choreo.sheet.d0 + motion.choreo.sheet.codeAt));
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [code, total, reduced, ms]);

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

  const days = daysUntil(invite.data.expiresAt);

  return (
    <View style={[styles.card, { backgroundColor: colors.stampPaper, borderColor: colors.stampInk, boxShadow: shadows.bag }]}>
      <View style={[styles.rBox, { borderColor: colors.stampInk }]}>
        <AppText role="initialLg" style={[styles.r, { color: colors.stampInk }]}>
          R
        </AppText>
      </View>
      <View style={styles.middle}>
        <AppText role="monoXs" style={[styles.kicker, { color: colors.stampInk }]}>
          REGISTERED · INVITE SOMEONE ELSE
        </AppText>
        <View
          style={styles.codeRow}
          accessible
          accessibilityLabel={`Invite code ${invite.data.code.split('').join(' ')}`}
        >
          <AppText role="codeSm" style={{ color: colors.stampInk }}>
            {typedCode(invite.data.code, typed)}
          </AppText>
          {typing ? (
            <Animated.View style={[styles.caret, { backgroundColor: colors.airmailBlue }, caretStyle]} />
          ) : null}
        </View>
        <Barcode color={colors.stampInk} />
        <AppText role="metaSm" style={[styles.expiry, { color: colors.stampInk }]}>
          Works once · expires in {days} {days === 1 ? 'day' : 'days'}
        </AppText>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Copied' : 'Copy code'}
          onPress={onCopy}
          hitSlop={4}
          style={({ pressed }) => [styles.action, { borderColor: colors.ruleWarm, borderWidth: 1.5 }, pressed && styles.pressed]}
        >
          {copied ? (
            <Check size={17} color={colors.stampInk} strokeWidth={iconStrokeWidth} />
          ) : (
            <Copy size={17} color={colors.stampInk} strokeWidth={iconStrokeWidth} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share link"
          onPress={onShare}
          hitSlop={4}
          style={({ pressed }) => [styles.action, { backgroundColor: colors.stampInk }, pressed && styles.pressed]}
        >
          <ShareIcon size={17} color={colors.stampPaper} strokeWidth={iconStrokeWidth} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  card: { borderRadius: radius.tag, borderWidth: 1.5, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rBox: { width: 44, height: 52, borderWidth: 2, borderRadius: radius.airmailInner, alignItems: 'center', justifyContent: 'center' },
  r: { fontSize: 30, lineHeight: 32 },
  middle: { flex: 1, minWidth: 0 },
  kicker: { letterSpacing: 1, opacity: 0.8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', height: 24, marginTop: 3 },
  caret: { width: CARET.width, height: CARET.height, marginLeft: 1 },
  barcode: { width: BARCODE.width, height: BARCODE.height, marginTop: 3 },
  bar: { position: 'absolute', top: 0, bottom: 0 },
  expiry: { marginTop: 3, fontSize: 12, lineHeight: 16, opacity: 0.7 },
  actions: { gap: 8 },
  action: { width: 40, height: 36, borderRadius: radius.codeBox, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
