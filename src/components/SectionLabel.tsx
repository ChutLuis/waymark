import type { StyleProp, TextStyle } from 'react-native';
import { AppText } from './AppText';

interface SectionLabelProps {
  children: string;
  tone?: 'muted' | 'accent';
  style?: StyleProp<TextStyle>;
}

/** Uppercase kicker used for section headings and date badges. */
export function SectionLabel({ children, tone = 'muted', style }: SectionLabelProps) {
  return (
    <AppText role="kicker" tone={tone} style={style}>
      {children}
    </AppText>
  );
}
