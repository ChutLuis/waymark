import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { bezierAt, useEntrance } from '@/components/motion';
import { motion, radius, shadows, useTheme } from '@/theme';

export interface AddressLine {
  key: string;
  label: 'FROM' | 'TO';
  name: string;
  /** "you · owner", "joined 18 Sep". */
  note: string;
}

const STAMP = { width: 32, height: 40 } as const;

/** A name written in by hand: revealed left to right by a clip. */
function Handwriting({ text, delay }: { text: string; delay: number }) {
  const [width, setWidth] = useState(0);
  const p = useEntrance(motion.choreo.sheet.write, delay);
  const clip = useAnimatedStyle(() => ({ width: width * bezierAt(motion.easing.write, p.value) }));
  return (
    <View style={styles.writeHost}>
      {/* An invisible copy sets the line's size; the clipped copy is drawn. */}
      <AppText role="addressLg" numberOfLines={1} style={styles.ghost} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {text}
      </AppText>
      <Animated.View style={[styles.writeClip, clip]}>
        <AppText role="addressLg" numberOfLines={1} style={{ width }}>
          {text}
        </AppText>
      </Animated.View>
    </View>
  );
}

/**
 * The Trip page's people, addressed like an envelope (Airmail v4 · 05): FROM
 * the owner, TO everyone else, each with their initial stamp. The names are
 * written in on open, the FROM name at d0 + 500 and the TO names after.
 */
export function AddressCard({ lines }: { lines: AddressLine[] }) {
  const { colors } = useTheme();
  const s = motion.choreo.sheet;
  return (
    <View style={[styles.card, { backgroundColor: colors.paper, boxShadow: shadows.card }]}>
      {lines.map((line, i) => (
        <View
          key={line.key}
          style={[styles.row, i < lines.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.rule } : null]}
          accessible
          accessibilityLabel={`${line.label === 'FROM' ? 'From' : 'To'} ${line.name}, ${line.note}`}
        >
          <AppText role="tagSm" tone="secondary" style={styles.label}>
            {line.label}
          </AppText>
          <View style={styles.text}>
            <Handwriting text={line.name} delay={s.d0 + (i === 0 ? s.fromAt : s.toAt + (i - 1) * (s.toAt - s.fromAt))} />
            <AppText role="addressNote" tone="muted">
              {line.note}
            </AppText>
          </View>
          <PerforatedStamp width={STAMP.width} height={STAMP.height} size="xs">
            <View style={[styles.initialPanel, { backgroundColor: colors.stampInk }]}>
              <AppText role="addressInitial" style={{ color: colors.stampPaper }}>
                {(line.name.trim()[0] ?? '?').toUpperCase()}
              </AppText>
            </View>
          </PerforatedStamp>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, paddingVertical: 6, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  label: { width: 36, letterSpacing: 0.8 },
  text: { flex: 1, minWidth: 0 },
  writeHost: { alignSelf: 'flex-start', maxWidth: '100%' },
  ghost: { opacity: 0 },
  writeClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  initialPanel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
