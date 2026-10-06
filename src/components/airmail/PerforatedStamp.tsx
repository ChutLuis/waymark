import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Mask, Rect } from 'react-native-svg';
import { radius, shadows, stampText, useTheme } from '@/theme';
import { perforationOffsets } from './perforation';

export { perforationOffsets } from './perforation';

export type StampSize = 'lg' | 'md' | 'sm' | 'mini' | 'xs';
export type StampTone = 'paper' | 'stampPaper' | 'ink' | 'airmailBlue';

/** Geometry per the audit override (perforations) and README's stamp table. */
export const STAMP_VARIANTS: Record<
  StampSize,
  { padding: number; hole: number; pitch: number; nameStrip: number }
> = {
  lg: { padding: 5, hole: 3, pitch: 8, nameStrip: stampText.lg.nameStrip },
  md: { padding: 5, hole: 3, pitch: 8, nameStrip: stampText.md.nameStrip },
  sm: { padding: 5, hole: 3, pitch: 8, nameStrip: stampText.sm.nameStrip },
  // 40x48 past-trip stamp: padding 5, no name strip.
  mini: { padding: 5, hole: 3, pitch: 8, nameStrip: 0 },
  // 20-30pt stamps: padding 2.5, fine perforations.
  xs: { padding: 2.5, hole: 1.5, pitch: 4, nameStrip: stampText.xs.nameStrip },
};

interface PerforatedStampProps {
  width: number;
  height: number;
  size?: StampSize;
  /** Frame surface: white for art stamps, `paper` on the trips-list header. */
  tone?: StampTone;
  /** Perforations on/off (dashed slot stamps skip them). */
  perforated?: boolean;
  /** Drop shadow that follows the perforated outline. */
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * A stamp frame with perforated edges. Hole centres sit on the frame's outer
 * edge line (per the audit override), and the holes are punched from the frame
 * with an SVG mask, so whatever sits behind shows through — matching the CSS
 * `mask` in the design. The shadow is drawn as an offset copy of the same
 * masked shape inside the SVG, so it follows the scalloped outline rather than
 * a plain rectangle.
 */
export function PerforatedStamp({
  width,
  height,
  size = 'md',
  tone = 'stampPaper',
  perforated = true,
  shadow = true,
  style,
  children,
}: PerforatedStampProps) {
  const { colors } = useTheme();
  const v = STAMP_VARIANTS[size];
  const fill =
    tone === 'ink'
      ? colors.ink
      : tone === 'paper'
        ? colors.paper
        : tone === 'airmailBlue'
          ? colors.airmailBlue
          : colors.stampPaper;
  const id = `stamp-mask-${tone}-${size}-${Math.round(width)}x${Math.round(height)}`;

  const circles: { cx: number; cy: number }[] = [];
  const r = v.hole;
  if (perforated) {
    const cols = perforationOffsets(width, v.pitch);
    const rows = perforationOffsets(height, v.pitch);
    for (const x of cols) {
      circles.push({ cx: x, cy: 0 });
      circles.push({ cx: x, cy: height });
    }
    for (const y of rows) {
      circles.push({ cx: 0, cy: y });
      circles.push({ cx: width, cy: y });
    }
  }

  const shadowOffset = Math.round(width) >= 40 ? 1 : 0.8;

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id={id}>
            <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
            {circles.map((c, i) => (
              <Circle key={i} cx={c.cx} cy={c.cy} r={r} fill="#000000" />
            ))}
          </Mask>
        </Defs>
        {shadow ? (
          <G transform={`translate(0 ${shadowOffset})`} opacity={0.3}>
            <Rect x={0} y={0} width={width} height={height} fill={colors.ink} mask={`url(#${id})`} />
          </G>
        ) : null}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fill}
          mask={`url(#${id})`}
        />
      </Svg>
      <View
        style={[StyleSheet.absoluteFill, styles.content, { padding: v.padding }]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </View>
  );
}

export function stampShadow(small: boolean) {
  return { boxShadow: small ? shadows.stampSmall : shadows.stamp };
}

const styles = StyleSheet.create({
  content: {
    borderRadius: radius.airmailInner,
    overflow: 'hidden',
  },
});