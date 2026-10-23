import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { fontFamilies, useTheme } from '@/theme';

const RMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** "19 V" + year from an ISO date, the postmark's date line. */
export function romanDateParts(iso: string | null): { dayMonth: string; year: string } {
  if (!iso) return { dayMonth: '', year: '' };
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return { dayMonth: '', year: '' };
  return {
    dayMonth: `${Number(match[3])} ${RMAN[Number(match[2])]}`,
    year: match[1],
  };
}

interface PostmarkProps {
  /** Latin city text, e.g. LISBOA. Compact variant omits text. */
  city?: string;
  /** Trip end date (ISO). */
  date?: string | null;
  variant?: 'full' | 'compact';
  style?: StyleProp<ViewStyle>;
}

/** The circular postmark that lands on a done stamp. */
export function Postmark({ city, date = null, variant = 'full', style }: PostmarkProps) {
  const { colors } = useTheme();
  const ink = colors.stampInk;

  if (variant === 'compact') {
    return (
      <View style={[styles.host, { width: 64, height: 44 }, style]} pointerEvents="none">
        <Svg width={64} height={44} viewBox="0 0 64 44">
          <Circle cx={20} cy={22} r={17} fill="none" stroke={ink} strokeWidth={1.6} />
          <Circle cx={20} cy={22} r={10} fill="none" stroke={ink} strokeWidth={1.2} />
          {[14, 22, 30].map((y) => (
            <Path
              key={y}
              d={`M38 ${y} q4.5 -3 9 0 t9 0`}
              fill="none"
              stroke={ink}
              strokeWidth={1.6}
            />
          ))}
        </Svg>
      </View>
    );
  }

  const { dayMonth, year } = romanDateParts(date);
  return (
    <View style={[styles.host, { width: 100, height: 60 }, style]} pointerEvents="none">
      <Svg width={100} height={60} viewBox="0 0 100 60" opacity={0.85}>
        <Path id="pm-arc" d="M8 30 A22 22 0 0 1 52 30" fill="none" />
        <Circle cx={30} cy={30} r={27} fill="none" stroke={ink} strokeWidth={1.5} />
        <Circle cx={30} cy={30} r={15} fill="none" stroke={ink} strokeWidth={1} />
        {city ? (
          <SvgText
            fill={ink}
            fontFamily={fontFamilies.mono}
            fontSize={6.5}
            letterSpacing={1}
            textAnchor="middle"
          >
            <TextPath href="#pm-arc" startOffset="50%">
              {city}
            </TextPath>
          </SvgText>
        ) : null}
        {dayMonth ? (
          <SvgText
            x={30}
            y={29}
            fill={ink}
            fontFamily={fontFamilies.mono}
            fontSize={6.5}
            textAnchor="middle"
          >
            {dayMonth}
          </SvgText>
        ) : null}
        {year ? (
          <SvgText
            x={30}
            y={37}
            fill={ink}
            fontFamily={fontFamilies.mono}
            fontSize={6.5}
            textAnchor="middle"
          >
            {year}
          </SvgText>
        ) : null}
        {[20, 30, 40].map((y) => (
          <Path
            key={y}
            d={`M60 ${y} q5 -3.5 10 0 t10 0 10 0`}
            fill="none"
            stroke={ink}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});