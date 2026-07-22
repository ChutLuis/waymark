import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { AppText } from './AppText';
import { fontFamilies, radius, spacing, useTheme } from '@/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  optionalTag?: string;
  error?: string;
  multiline?: boolean;
  /** Extra input styling (e.g. the mono invite-code field). */
  inputStyle?: StyleProp<TextStyle>;
}

/** Labeled form field with inline validation, per the component spec. */
export function TextField({
  label,
  optionalTag,
  error,
  multiline = false,
  inputStyle,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.semantic.danger.base
    : focused
      ? colors.accent.base
      : colors.hairline.strong;

  return (
    <View>
      <View style={styles.labelRow}>
        <AppText role="label">{label}</AppText>
        {optionalTag ? (
          <AppText role="label" tone="faint" style={styles.optional}>
            {optionalTag}
          </AppText>
        ) : null}
      </View>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        placeholderTextColor={colors.text.faint}
        selectionColor={colors.accent.base}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: colors.surface.bg,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            color: colors.text.primary,
          },
          inputStyle,
        ]}
      />
      {error ? (
        <AppText role="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    marginBottom: spacing.s1 + 2,
  },
  optional: {
    fontFamily: fontFamilies.textRegular,
    marginLeft: spacing.s1,
  },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s3 + 2,
    paddingVertical: 0,
    fontFamily: fontFamilies.textRegular,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 200,
    paddingVertical: spacing.s3 + 2,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  error: {
    marginTop: spacing.s1 + 2,
  },
});
