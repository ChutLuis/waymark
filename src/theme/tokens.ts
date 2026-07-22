/**
 * Waymark design tokens, transcribed from the design deliverable
 * (tokens.json v1.0.0). Feature code must reference these through the
 * theme module — never raw values.
 */
import { Platform, StyleSheet } from 'react-native';
import type { TextStyle } from 'react-native';

export interface Palette {
  surface: { bg: string; raised: string; sunken: string };
  hairline: { default: string; strong: string };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    faint: string;
    inverse: string;
  };
  accent: {
    base: string;
    pressed: string;
    disabled: string;
    onAccent: string;
    ink: string;
    wash: string;
  };
  semantic: {
    success: { base: string; wash: string };
    warning: { base: string; wash: string };
    danger: { base: string; pressed: string; wash: string };
    info: { base: string; wash: string };
  };
  overlay: { scrim: string };
  avatar: { bg: string; bgAlt: string; text: string };
}

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    surface: { bg: '#FAF7F1', raised: '#FDFBF7', sunken: '#F2EDE2' },
    hairline: { default: '#E7E0D4', strong: '#D9D1C0' },
    text: {
      primary: '#2B2620',
      secondary: '#6B6355',
      muted: '#8A8072',
      faint: '#B3A992',
      inverse: '#FAF7F1',
    },
    accent: {
      base: '#8A5D22',
      pressed: '#6F4A1B',
      disabled: '#CDBB9E',
      onAccent: '#FAF7F1',
      ink: '#6F4A1B',
      wash: '#F3E9D8',
    },
    semantic: {
      success: { base: '#3E7A4E', wash: '#E7EFE4' },
      warning: { base: '#92610E', wash: '#F3E9D3' },
      danger: { base: '#AC4433', pressed: '#8C3628', wash: '#F4E4DE' },
      info: { base: '#4A6B8A', wash: '#E5EBEF' },
    },
    overlay: { scrim: 'rgba(43,38,32,0.40)' },
    avatar: { bg: '#E7E0D4', bgAlt: '#DDD5C7', text: '#5A5245' },
  },
  dark: {
    surface: { bg: '#1C1915', raised: '#24201B', sunken: '#151210' },
    hairline: { default: '#38322A', strong: '#4A4336' },
    text: {
      primary: '#F0EAE0',
      secondary: '#B5AC9D',
      muted: '#8A8072',
      faint: '#645C4F',
      inverse: '#2B2620',
    },
    accent: {
      base: '#D9A65C',
      pressed: '#C08F45',
      disabled: '#57492F',
      onAccent: '#241C10',
      ink: '#E0B26E',
      wash: '#332A1D',
    },
    semantic: {
      success: { base: '#7FBF93', wash: '#22301F' },
      warning: { base: '#D9B25C', wash: '#332B18' },
      danger: { base: '#E08972', pressed: '#EBA28F', wash: '#3A231D' },
      info: { base: '#93B3CE', wash: '#1F2933' },
    },
    overlay: { scrim: 'rgba(0,0,0,0.55)' },
    avatar: { bg: '#38322A', bgAlt: '#443D32', text: '#B5AC9D' },
  },
};

export const fontFamilies = {
  displayRegular: 'Newsreader_400Regular',
  displayItalic: 'Newsreader_400Regular_Italic',
  displayMedium: 'Newsreader_500Medium',
  textRegular: 'SourceSans3_400Regular',
  textMedium: 'SourceSans3_500Medium',
  textSemiBold: 'SourceSans3_600SemiBold',
  /** Invite codes only. */
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
} as const;

export type TypeRole =
  | 'display'
  | 'title'
  | 'serifNote'
  | 'heading'
  | 'body'
  | 'bodyMedium'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'kicker';

export const typeScale: Record<TypeRole, TextStyle> = {
  display: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.1,
  },
  serifNote: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 17,
    lineHeight: 24,
  },
  heading: {
    fontFamily: fontFamilies.textSemiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamilies.textRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamilies.textMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fontFamilies.textSemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: fontFamilies.textSemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fontFamilies.textRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  kicker: {
    fontFamily: fontFamilies.textSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
};

export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 40,
  s9: 48,
  screenGutter: 20,
} as const;

export const radius = {
  xs: 4,
  sm: 7,
  md: 10,
  lg: 14,
  sheet: 20,
  full: 999,
} as const;

export const hairlineWidth = Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth;

/** The only shadow in the system: FAB, bottom sheet, toast. */
export const floatingShadow = {
  shadowColor: '#2B2620',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.14,
  shadowRadius: 3,
  elevation: 2,
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 300 },
} as const;

export const iconSizes = { sm: 16, md: 20, lg: 24 } as const;
export const iconStrokeWidth = 1.6;

export const hitTargetMin = 44;
