import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Check, Copy, Share as ShareIcon } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useLoop, useMotion } from '@/components/motion';
import { codeLength, typedCode } from '@/features/trips/sheet';
import { disabledOpacity, hitTargetMin, iconStrokeWidth, motion, radius, shadows, spacing, useTheme } from '@/theme';
import { inviteShareMessage, useTripInvite } from './hooks';

const CARET = { width: 2, height: 18 } as const;
const BARCODE = { width: 150, height: 10 } as const;
/** The barcode's bar widths in points, repeating (2 on, 1 off, 1 on, 3 off, 3 on, 1 off). */
const BARS = [2, 1, 1, 3, 3, 1];

/**
 * Whole days left, rounded: a fresh 7-day invite reads 7 even when this
 * device's clock runs a second behind the server's (a ceiling made it 8).
 * The last day still reads 1, not 0.
 */
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.max(1, Math.round(ms / 86_400_000));
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
 * motion the code appears in full at once. Until the code arrives the card is
 * already printed at its full size, with dots for the code and its buttons
 * off, so nothing under it moves when the code lands.
 */
export function RegisteredInvite({
  tripId,
  tripName = '',
  presentation = 'card',
}: {
  tripId: string;
  tripName?: string;
  presentation?: 'card' | 'sheet';
}) {
  const { colors } = useTheme();
  const { reduced, ms } = useMotion();
  const invite = useTripInvite(tripId);
  const [typed, setTyped] = useState(0);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const code = invite.data?.code ?? '';
  const ready = code.length > 0;
  const total = codeLength(code);
  // The shortcut is a utility surface: show the full code immediately, without
  // waiting for the Trip page's stamp-sheet choreography.
  const expanded = presentation === 'sheet';
  // With reduced motion the code is printed whole at once.
  const shown = expanded || reduced ? total : typed;
  const typing = !expanded && !reduced && typed < total;
  const caret = useLoop(motion.choreo.sheet.caretBlink, typing && code.length > 0);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value < 0.5 ? 1 : 0 }));

  useEffect(() => {
    if (!code || expanded || reduced) return;
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
  }, [code, total, reduced, ms, expanded]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const onShare = async () => {
    if (!ready) return;
    const message = inviteShareMessage(tripName, code);
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: message });
        else await Clipboard.setStringAsync(code);
      } else {
        await Share.share({ message });
      }
    } catch {
      // Share sheet dismissed; nothing to do.
    }
  };

  const onCopy = async () => {
    if (!ready) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  // A failed background refetch keeps the code it already has.
  if (invite.isError && !ready) {
    return (
      <View style={styles.loading}>
        <AppText role="bodySm" tone="muted">
          Couldn&apos;t create an invite.
        </AppText>
        <Button label="Try again" variant="quiet" size="sm" onPress={() => invite.refetch()} />
      </View>
    );
  }

  const days = invite.data ? daysUntil(invite.data.expiresAt) : 0;
  const status = invite.data
    ? `Works once · expires in ${days} ${days === 1 ? 'day' : 'days'}`
    : invite.isPaused
      ? 'Waiting for a connection…'
      : 'Printing the invite code…';
  const dots = !ready || shown === 0;

  return (
    <View style={[styles.card, expanded && styles.sheetCard, { backgroundColor: colors.stampPaper, borderColor: colors.stampInk, boxShadow: shadows.bag }]}>
      <View
        // The registered-mail "R" is decoration; screen readers read "capital R".
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        accessibilityElementsHidden
        style={[styles.rBox, { borderColor: colors.stampInk }]}
      >
        <AppText role="initialLg" style={[styles.r, { color: colors.stampInk }]}>
          R
        </AppText>
      </View>
      <View style={styles.middle}>
        <AppText role="monoXs" style={[styles.kicker, { color: colors.stampInk }]}>
          REGISTERED · INVITE SOMEONE ELSE
        </AppText>
        <View
          style={[styles.codeRow, expanded && styles.sheetCodeRow]}
          accessible
          accessibilityLabel={ready ? `Invite code ${code.split('').join(' ')}` : status}
        >
          <AppText role="codeSm" style={{ color: dots ? colors.postmarkFaint : colors.stampInk }}>
            {dots ? '···· ····' : typedCode(code, shown)}
          </AppText>
          {typing && typed > 0 ? (
            <Animated.View style={[styles.caret, { backgroundColor: colors.parAvion }, caretStyle]} />
          ) : null}
        </View>
        <Barcode color={colors.stampInk} />
        <AppText role="metaXs" style={[styles.expiry, { color: colors.stampInk }]}>
          {status}
        </AppText>
      </View>
      <View style={[styles.actions, expanded && styles.sheetActions]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Copied' : 'Copy code'}
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={onCopy}
          hitSlop={4}
          style={({ pressed }) => [
            styles.action,
            expanded && styles.sheetAction,
            {
              backgroundColor: copied ? colors.stampInk : colors.stampPaper,
              borderColor: colors.stampInk,
              borderWidth: 2,
            },
            !ready && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {copied ? (
            <Check size={17} color={colors.stampPaper} strokeWidth={iconStrokeWidth} />
          ) : (
            <Copy size={17} color={colors.stampInk} strokeWidth={iconStrokeWidth} />
          )}
          {expanded ? (
            <AppText
              role="link"
              style={[
                styles.sheetActionLabel,
                { color: copied ? colors.stampPaper : colors.stampInk },
              ]}
            >
              {copied ? 'Copied' : 'Copy code'}
            </AppText>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share code"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={onShare}
          hitSlop={4}
          style={({ pressed }) => [
            styles.action,
            expanded && styles.sheetAction,
            { backgroundColor: colors.stampInk },
            !ready && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <ShareIcon size={17} color={colors.stampPaper} strokeWidth={iconStrokeWidth} />
          {expanded ? <AppText role="link" style={[styles.sheetActionLabel, { color: colors.stampPaper }]}>Share code</AppText> : null}
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
  expiry: { marginTop: 3, opacity: 0.7 },
  actions: { gap: 8 },
  action: { width: 40, height: 36, borderRadius: radius.codeBox, alignItems: 'center', justifyContent: 'center' },
  sheetCard: { flexWrap: 'wrap' },
  sheetCodeRow: { height: 'auto', minHeight: spacing.s11 },
  sheetActions: { width: '100%', flexDirection: 'row', gap: spacing.s3 },
  sheetAction: {
    flex: 1,
    width: 'auto',
    height: 'auto',
    minHeight: hitTargetMin,
    flexDirection: 'row',
    gap: spacing.s2,
    padding: spacing.s3,
  },
  sheetActionLabel: { flexShrink: 1, textAlign: 'center' },
  disabled: { opacity: disabledOpacity },
  pressed: { opacity: 0.7 },
});
