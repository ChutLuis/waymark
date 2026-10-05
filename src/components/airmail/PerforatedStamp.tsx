import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { radius, shadows, stampText, useTheme } from '@/theme';

export type StampSize = 'lg' | 'md' | 'sm' | 'xs';
export type StampTone = 'paper' | 'stampPaper' | 'ink';

/** Geometry per README's stamp table (art-window sizes are used by SceneStamp). */
export const STAMP_VARIANTS: Record<
  StampSize,
  { padding: number; hole: number; pitch: number; phase: number; nameStrip: number }
> = {
  lg: { padding: 5, hole: 3, pitch: 8, phase: -4, nameStrip: stampText.lg.nameStrip },
  md: { padding: 5, hole: 3, pitch: 8, phase: -4, nameStrip: stampText.md.nameStrip },
  sm: { padding: 5, hole: 3, pitch: 8, phase: -4, nameStrip: stampText.sm.nameStrip },
  xs: { padding: 2.5, hole: 1.5, pitch: 4, phase: -2, nameStrip: stampText.xs.nameStrip },
};

interface PerforatedStampProps {
  width: number;
  height: number;
  size?: StampSize;
  /** Frame surface: white for art stamps, `paper` on the trips-list header. */
  tone?: StampTone;
  /** Perforations on/off (dashed slot stamps skip them). */
  perforated?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * A stamp frame with perforated edges. The holes are punched from the frame
 * with an SVG mask, so whatever sits behind shows through — matching the CSS
 * `mask` in the design.
 */
export function PerforatedStamp({
  width,
  height,
  size = 'md',
  tone = 'stampPaper',
  perforated = true,
  style,
  children,
}: PerforatedStampProps) {
  const { colors } = useTheme();
  const v = STAMP_VARIANTS[size];
  const fill = tone === 'ink' ? colors.ink : tone === 'paper' ? colors.paper : colors.stampPaper;
  const id = `stamp-mask-${tone}-${size}-${Math.round(width)}x${Math.round(height)}`;

  const circles: { cx: number; cy: number }[] = [];
  const r = v.hole;
  if (perforated) {
    // Holes sit centred on the edge line at `padding`, phase-shifted so corners
    // get half-holes. Circles outside the frame are clipped by the SVG.
    for (let x = v.phase; x <= width + v.pitch; x += v.pitch) {
      circles.push({ cx: x, cy: v.padding });
      circles.push({ cx: x, cy: height - v.padding });
    }
    for (let y = v.phase; y <= height + v.pitch; y += v.pitch) {
      circles.push({ cx: v.padding, cy: y });
      circles.push({ cx: width - v.padding, cy: y });
    }
  }

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
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fill}
          mask={`url(#${id})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.content]} pointerEvents="box-none">
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