import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';

/** The dashed-compass mark used on auth screens. */
export function BrandMark({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" accessibilityLabel="Waymark">
      <Circle
        cx={22}
        cy={22}
        r={20}
        fill="none"
        stroke={colors.hairline.strong}
        strokeWidth={1.6}
        strokeDasharray="3.5 4.5"
      />
      <Circle cx={22} cy={22} r={5} fill={colors.accent.base} />
    </Svg>
  );
}
