import { Text, type TextProps } from 'react-native';
import { typeScale, useTheme, type TypeRole } from '@/theme';

type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'body'
  | 'inverse'
  | 'accent'
  | 'danger'
  | 'success'
  | 'kraft';

interface AppTextProps extends Omit<TextProps, 'role'> {
  role?: TypeRole;
  tone?: TextTone;
}

/** Themed text. All copy in the app renders through this component. */
export function AppText({ role = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color = (() => {
    switch (tone) {
      case 'primary':
        return colors.ink;
      case 'secondary':
        return colors.ink2;
      case 'muted':
        return colors.ink3;
      case 'body':
        return colors.inkBody;
      case 'inverse':
        return colors.paper;
      case 'accent':
        return colors.airmailBlue;
      case 'danger':
        return colors.wax;
      case 'success':
        return colors.success;
      case 'kraft':
        return colors.kraftInk;
    }
  })();
  return <Text {...rest} style={[typeScale[role], { color }, style]} />;
}