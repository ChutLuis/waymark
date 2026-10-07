import { useMemo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { radius, spacing, useTheme } from '@/theme';

/** The 8 characters of an invite code, grouped 4 + 4. */
export const INVITE_CODE_LENGTH = 8;

export function sanitizeInviteCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, INVITE_CODE_LENGTH);
}

interface InviteCodeEntryProps {
  value: string;
  onChangeText: (code: string) => void;
  /** Focus the hidden input on mount. */
  autoFocus?: boolean;
  /** Submitted (keyboard "done"). */
  onSubmit?: () => void;
  /** Rendered under the boxes, e.g. a "Code found" row or an error. */
  children?: ReactNode;
}

/**
 * The eight-box invite-code field, shared by the signed-in join screen and the
 * signed-out code screen in the (auth) group so both look and behave the same.
 */
export function InviteCodeEntry({
  value,
  onChangeText,
  autoFocus = false,
  onSubmit,
  children,
}: InviteCodeEntryProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const chars = useMemo(
    () => Array.from({ length: INVITE_CODE_LENGTH }, (_, i) => value[i] ?? ''),
    [value],
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit invite code"
        onPress={() => inputRef.current?.focus()}
        style={styles.codeRow}
      >
        {[0, 1].map((group) => (
          <View key={group} style={[styles.codeGroup, group === 1 && styles.codeGroupSpaced]}>
            {chars.slice(group * 4, group * 4 + 4).map((char, index) => (
              <View
                key={group * 4 + index}
                style={[styles.codeBox, { backgroundColor: colors.paper, borderColor: colors.ink }]}
              >
                <AppText role="codeBox" style={{ color: colors.ink }}>
                  {char}
                </AppText>
              </View>
            ))}
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(sanitizeInviteCode(text))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={INVITE_CODE_LENGTH}
        accessibilityLabel="Invite code"
        style={styles.hiddenInput}
        autoFocus={autoFocus}
        onSubmitEditing={() => onSubmit?.()}
      />
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  codeRow: { flexDirection: 'row', marginTop: spacing.s9 },
  codeGroup: { flexDirection: 'row', gap: 6 },
  codeGroupSpaced: { marginLeft: 14 },
  codeBox: {
    width: 36,
    height: 54,
    borderRadius: radius.codeBox,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});