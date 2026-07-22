import { Text, type TextProps } from 'react-native';
import { typeScale, useTheme, type TypeRole } from '@/theme';

type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'faint'
  | 'inverse'
  | 'accent'
  | 'danger';

interface AppTextProps extends Omit<TextProps, 'role'> {
  role?: TypeRole;
  tone?: TextTone;
}

/** Themed text. All copy in the app renders through this component. */
export function AppText({ role = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color =
    tone === 'accent'
      ? colors.accent.ink
      : tone === 'danger'
        ? colors.semantic.danger.base
        : colors.text[tone];
  return <Text {...rest} style={[typeScale[role], { color }, style]} />;
}
