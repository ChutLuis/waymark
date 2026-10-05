import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { AppText } from './AppText';
import { radius, spacing, typeScale, useTheme } from '@/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  optionalTag?: string;
  error?: string;
  multiline?: boolean;
  /** Show a trailing Show/Hide link? */
  revealable?: boolean;
  /** Extra input styling (e.g. the mono invite-code field). */
  inputStyle?: StyleProp<TextStyle>;
}

/** Labeled form field with inline validation, per the component spec. */
export function TextField({
  label,
  optionalTag,
  error,
  multiline = false,
  revealable = false,
  inputStyle,
  secureTextEntry,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.wax : focused ? colors.ink : colors.border;
  const borderWidth = focused || error ? 2 : 1.5;

  return (
    <View>
      <View style={styles.labelRow}>
        <AppText role="kicker" tone="secondary">
          {label}
        </AppText>
        {optionalTag ? (
          <AppText role="kicker" tone="muted" style={styles.optional}>
            {optionalTag}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.paper,
            borderColor,
            borderWidth,
          },
          multiline && styles.fieldMultiline,
        ]}
      >
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          multiline={multiline}
          secureTextEntry={revealable ? secureTextEntry && !revealed : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.ink}
          style={[
            typeScale.body,
            styles.input,
            { color: colors.ink },
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
        />
        {revealable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <AppText role="link" style={[styles.reveal, { color: colors.ink }]}>
              {revealed ? 'Hide' : 'Show'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText role="bodySm" style={[styles.error, { color: colors.wax }]}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    gap: spacing.s2,
    marginBottom: spacing.s2,
  },
  optional: {
    textTransform: 'lowercase',
  },
  field: {
    minHeight: 52,
    borderRadius: radius.input,
    paddingHorizontal: spacing.s7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldMultiline: {
    minHeight: 160,
    alignItems: 'flex-start',
    paddingVertical: spacing.s5,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 130,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  reveal: {
    fontSize: 15,
    lineHeight: 20,
    textDecorationLine: 'underline',
    marginLeft: spacing.s3,
  },
  error: {
    marginTop: spacing.s2,
  },
  pressed: {
    opacity: 0.7,
  },
});