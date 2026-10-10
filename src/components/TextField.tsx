import { useState, type ReactNode } from 'react';
import {
  Platform,
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
  /** Right-aligned node on the label row (e.g. "Stamp ready"). */
  labelAccessory?: ReactNode;
}

/** Labeled form field with inline validation, per the component spec. */
export function TextField({
  label,
  optionalTag,
  error,
  multiline = false,
  revealable = false,
  inputStyle,
  labelAccessory,
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
        {labelAccessory ? <View style={styles.labelAccessory}>{labelAccessory}</View> : null}
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
            // Remove the browser's default focus ring on web; focus is shown by
            // the field's own inset border.
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null,
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
    alignItems: 'center',
    gap: spacing.s2,
    marginBottom: spacing.s2,
  },
  optional: {
    textTransform: 'lowercase',
  },
  labelAccessory: {
    marginLeft: 'auto',
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
    // Android's EditText adds its own padding; zero it so text sits exactly at
    // the field's 16 pt inset, as on web and iOS (and as the date fields do).
    paddingVertical: 0,
    paddingHorizontal: 0,
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