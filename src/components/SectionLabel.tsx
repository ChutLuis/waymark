import type { StyleProp, TextStyle } from 'react-native';
import { AppText } from './AppText';

interface SectionLabelProps {
  children: string;
  tone?: 'secondary' | 'muted' | 'kraft';
  long?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Courier Prime uppercase kicker used for section headings. */
export function SectionLabel({ children, tone = 'secondary', long = false, style }: SectionLabelProps) {
  return (
    <AppText role={long ? 'kickerLg' : 'kicker'} tone={tone} style={style}>
      {children}
    </AppText>
  );
}