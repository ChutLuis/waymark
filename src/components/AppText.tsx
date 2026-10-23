import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
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

/**
 * Android adds letter spacing after every glyph but leaves the last one out of
 * the measured width, so letter-spaced labels lose their final letter ("WED"
 * → "WE") or wrap their last word away. Trailing room equal to the spacing
 * puts it back; an explicit padding in `style` still wins.
 */
const LETTER_SPACING_ROOM: Partial<Record<TypeRole, TextStyle>> =
  Platform.OS === 'android'
    ? Object.fromEntries(
        Object.entries(typeScale)
          .filter(([, style]) => (style.letterSpacing ?? 0) > 0)
          .map(([role, style]) => [role, { paddingRight: Math.ceil(style.letterSpacing ?? 0) }]),
      )
    : {};

/**
 * Besley's ascent is 1.25× its size. When a line box is shorter than that,
 * React Native's Android line-height span puts the baseline on the box's
 * bottom edge and the descenders (g, p, y) are clipped ("Packing",
 * "getaway"). Such text gets a line height of at least the ascent, pulled up
 * by the difference: the baseline stays where it was and the layout doesn't
 * move; the descenders get the room below it.
 */
const BESLEY_ASCENT = 1.25;

function numberOr(...values: unknown[]): number {
  for (const value of values) if (typeof value === 'number') return value;
  return 0;
}

function descenderRoom(role: TypeRole, style: TextProps['style']): TextStyle | null {
  if (Platform.OS !== 'android') return null;
  const flat = { ...typeScale[role], ...(StyleSheet.flatten(style) ?? {}) };
  const { fontFamily, fontSize, lineHeight } = flat;
  if (!fontFamily?.startsWith('Besley') || !fontSize || !lineHeight) return null;
  const roomy = Math.ceil(fontSize * BESLEY_ASCENT);
  if (lineHeight >= roomy) return null;
  return {
    lineHeight: roomy,
    marginTop: numberOr(flat.marginTop, flat.marginVertical, flat.margin) - (roomy - lineHeight),
  };
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
        return colors.danger;
      case 'success':
        return colors.success;
      case 'kraft':
        return colors.kraftInk;
    }
  })();
  return (
    <Text
      {...rest}
      style={[typeScale[role], LETTER_SPACING_ROOM[role], { color }, style, descenderRoom(role, style)]}
    />
  );
}