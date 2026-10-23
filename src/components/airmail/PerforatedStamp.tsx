import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, Mask, Path, Rect } from 'react-native-svg';
import { radius, shadows, stampText, useTheme } from '@/theme';
import { perforationOffsets, stampOutline } from './perforation';

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
 * Room around the stamp for its shadow (offset 1 + blur), inside the Svg. A
 * parent that clips (a horizontal ScrollView) must leave this much around it.
 */
export const STAMP_SHADOW_MARGIN = 3;

/**
 * A stamp frame with perforated edges. Hole centres sit on the frame's outer
 * edge line (per the audit override), and the holes are punched from the frame
 * with an SVG mask, so whatever sits behind shows through — matching the CSS
 * `mask` in the design. The shadow is a blurred, offset copy of the same masked
 * shape (README: `0 1px 2px`, or `0 1px 1.5px` on 40–64 pt stamps), so it
 * follows the scalloped outline rather than a plain rectangle. The Svg extends
 * past the stamp by STAMP_SHADOW_MARGIN so the shadow below the edge isn't
 * clipped. The shadow is a path, not the masked rect: react-native-svg filters
 * only shapes, and on Android masks them after the blur.
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
  const shape = `${tone}-${size}-${Math.round(width)}x${Math.round(height)}`;
  const id = `stamp-mask-${shape}`;
  const filterId = `stamp-shadow-${shape}`;

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
  // A CSS blur radius is twice the Gaussian deviation: 2px -> 1, 1.5px -> 0.75.
  const shadowBlur = width >= 40 && width <= 64 ? 0.75 : 1;
  const m = STAMP_SHADOW_MARGIN;
  const outlinePath = stampOutline(width, height, v.pitch, v.hole, perforated);
  const edgeStroke = tone === 'stampPaper' || tone === 'paper' ? colors.perforationEdge : undefined;

  return (
    <View style={[{ width, height }, style]}>
      <Svg
        width={width + 2 * m}
        height={height + 2 * m}
        style={[styles.svg, { left: -m, top: -m }]}
        pointerEvents="none"
      >
        <Defs>
          <Mask id={id}>
            <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
            {circles.map((c, i) => (
              <Circle key={i} cx={c.cx} cy={c.cy} r={r} fill="#000000" />
            ))}
          </Mask>
          {/* The region is the stamp plus the margin on every side, as fractions
              of the shape's box (Android reads user-space regions in canvas
              pixels, ignoring transforms). */}
          <Filter
            id={filterId}
            x={-m / width}
            y={-m / height}
            width={1 + (2 * m) / width}
            height={1 + (2 * m) / height}
          >
            <FeGaussianBlur stdDeviation={shadowBlur} />
          </Filter>
        </Defs>
        <G transform={`translate(${m} ${m})`}>
          {shadow ? (
            <G transform={`translate(0 ${shadowOffset})`} opacity={0.3}>
              <Path
                d={outlinePath}
                fill={colors.stampInk}
                filter={`url(#${filterId})`}
              />
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
          {edgeStroke ? (
            <Path
              d={outlinePath}
              fill="none"
              stroke={edgeStroke}
              strokeWidth={0.75}
            />
          ) : null}
        </G>
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
  svg: {
    position: 'absolute',
  },
  content: {
    borderRadius: radius.airmailInner,
    overflow: 'hidden',
  },
});