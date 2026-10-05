import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Pattern, Polygon, Rect } from 'react-native-svg';
import { AirmailStripes } from './AirmailBorder';

export type PatternKey = 'japan' | 'guatemala' | 'portugal' | 'airmail';

/** Japan · seigaiha (base paper), 16x8 tile of nested arcs. */
function SeigaihaTile() {
  const waves: { cx: number; cy: number }[] = [
    { cx: 0, cy: 8 },
    { cx: 16, cy: 8 },
    { cx: 8, cy: 12 },
  ];
  return (
    <>
      <Rect x={0} y={0} width={16} height={8} fill="#FFFCF5" />
      <G>
        {waves.map((w, i) => (
          <G key={i}>
            <Circle cx={w.cx} cy={w.cy} r={8} fill="none" stroke="#E58FA3" strokeWidth={1} />
            <Circle cx={w.cx} cy={w.cy} r={7} fill="none" stroke="#FFFCF5" strokeWidth={1.5} />
            <Circle cx={w.cx} cy={w.cy} r={5.5} fill="none" stroke="#F4B9C6" strokeWidth={1.5} />
            <Circle cx={w.cx} cy={w.cy} r={4} fill="none" stroke="#FFFCF5" strokeWidth={1.5} />
            <Circle cx={w.cx} cy={w.cy} r={2.5} fill="none" stroke="#F4B9C6" strokeWidth={1} />
          </G>
        ))}
      </G>
    </>
  );
}

/** Guatemala · huipil (base yellow), 12x12 tile of four corner triangles. */
function HuipilTile() {
  return (
    <>
      <Rect x={0} y={0} width={12} height={12} fill="#F2B705" />
      <Polygon points="0,0 12,0 6,6" fill="#B5245E" />
      <Polygon points="0,12 12,12 6,6" fill="#1F7A5C" />
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

interface PatternBandProps {
  pattern: PatternKey;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The destination pattern strip: seigaiha, huipil, azulejo or the airmail
 * fallback for destinations whose pattern isn't designed yet.
 */
export function PatternBand({ pattern, height = 12, style }: PatternBandProps) {
  if (pattern === 'airmail') {
    return (
      <View style={[styles.host, { height }, style]}>
        <AirmailStripes />
      </View>
    );
  }
  return (
    <View style={[styles.host, { height }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="seigaiha" x="0" y="0" width={16} height={8} patternUnits="userSpaceOnUse">
            <SeigaihaTile />
          </Pattern>
          <Pattern id="huipil" x="0" y="0" width={12} height={12} patternUnits="userSpaceOnUse">
            <HuipilTile />
          </Pattern>
          <Pattern id="azulejo" x="0" y="0" width={12} height={12} patternUnits="userSpaceOnUse">
            <AzulejoTile />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${pattern})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    overflow: 'hidden',
  },
});