import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Pattern, Polygon, Rect } from 'react-native-svg';
import { AirmailStripes } from './AirmailBorder';

export type PatternKey = 'japan' | 'guatemala' | 'portugal' | 'airmail';

/**
 * Japan · seigaiha, 16x8 tile of nested half-discs. Each scale is a set of
 * filled concentric half-discs (largest first), so overlapping rows cover the
 * one behind instead of showing through.
 */
function SeigaihaTile() {
  const scales: { cx: number; cy: number }[] = [
    { cx: 0, cy: 8 },
    { cx: 16, cy: 8 },
    { cx: 8, cy: 12 },
  ];
  return (
    <>
      <Rect x={0} y={0} width={16} height={8} fill="#FFFCF5" />
      {scales.map((s, i) => (
        <G key={i}>
          <Circle cx={s.cx} cy={s.cy} r={8} fill="#E58FA3" />
          <Circle cx={s.cx} cy={s.cy} r={7} fill="#FFFCF5" />
          <Circle cx={s.cx} cy={s.cy} r={5.5} fill="#F4B9C6" />
          <Circle cx={s.cx} cy={s.cy} r={4} fill="#FFFCF5" />
          <Circle cx={s.cx} cy={s.cy} r={2.5} fill="#F4B9C6" />
        </G>
      ))}
      {/* Front row, drawn last so it covers the row behind. */}
      {[{ cx: 8, cy: 12 }, { cx: 24, cy: 12 }].map((s, i) => (
        <G key={`front-${i}`}>
          <Circle cx={s.cx} cy={s.cy} r={8} fill="#E58FA3" />
          <Circle cx={s.cx} cy={s.cy} r={7} fill="#FFFCF5" />
          <Circle cx={s.cx} cy={s.cy} r={5.5} fill="#F4B9C6" />
          <Circle cx={s.cx} cy={s.cy} r={4} fill="#FFFCF5" />
          <Circle cx={s.cx} cy={s.cy} r={2.5} fill="#F4B9C6" />
        </G>
      ))}
    </>
  );
}

/**
 * Guatemala · huipil, 12x12 interlocking zigzag on yellow. Magenta teeth hang
 * from the top edge (centred at 6, 18, …); green teeth rise from the bottom
 * (centred at 0, 12, …), half a tile off.
 */
function HuipilTile() {
  return (
    <>
      <Rect x={0} y={0} width={12} height={12} fill="#F2B705" />
      <Polygon points="0,0 12,0 6,6" fill="#B5245E" />
      <Polygon points="-6,12 6,12 0,6" fill="#1F7A5C" />
      <Polygon points="6,12 18,12 12,6" fill="#1F7A5C" />
    </>
  );
}

/** Portugal · azulejo (base cream): quarter circles at the four corners + dot. */
function AzulejoTile() {
  const corners: [number, number][] = [
    [0, 0],
    [12, 0],
    [0, 12],
    [12, 12],
  ];
  return (
    <>
      <Rect x={0} y={0} width={12} height={12} fill="#F7F4EC" />
      {corners.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3.5} fill="#1F4FA3" />
      ))}
      <Circle cx={6} cy={6} r={2} fill="#1F4FA3" />
    </>
  );
}

/** Natural tile size per pattern. */
const TILE: Record<Exclude<PatternKey, 'airmail'>, { w: number; h: number }> = {
  japan: { w: 16, h: 8 },
  guatemala: { w: 12, h: 12 },
  portugal: { w: 12, h: 12 },
};

interface PatternBandProps {
  pattern: PatternKey;
  height?: number;
  /** Scale the tile to this size (e.g. the 8 pt new-trip preview band). */
  tile?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The destination pattern strip: seigaiha, huipil, azulejo or the airmail
 * fallback for destinations whose pattern isn't designed yet.
 */
export function PatternBand({ pattern, height = 12, tile, style }: PatternBandProps) {
  if (pattern === 'airmail') {
    return (
      <View style={[styles.host, { height }, style]}>
        <AirmailStripes />
      </View>
    );
  }
  const natural = TILE[pattern];
  const scale = tile ? tile / natural.h : 1;
  return (
    <View style={[styles.host, { height }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={`${pattern}-${height}-${tile ?? 'auto'}`}
            x="0"
            y="0"
            width={natural.w}
            height={natural.h}
            patternUnits="userSpaceOnUse"
            patternTransform={scale !== 1 ? `scale(${scale})` : undefined}
          >
            {pattern === 'japan' ? <SeigaihaTile /> : null}
            {pattern === 'guatemala' ? <HuipilTile /> : null}
            {pattern === 'portugal' ? <AzulejoTile /> : null}
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${pattern}-${height}-${tile ?? 'auto'})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    // `alignSelf: stretch` lets the band span its container (including the
    // preview's negative margins); `width: 100%` overrode those margins and
    // left the band short of the card edge (item 21).
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
});