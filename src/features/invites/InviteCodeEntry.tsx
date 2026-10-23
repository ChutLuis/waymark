import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ClipboardPaste } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { iconStrokeWidth, radius, spacing, useTheme } from '@/theme';
import { INVITE_CODE_LENGTH, sanitizeInviteCode } from './inviteCode';

const NOTHING_TO_PASTE = 'Nothing to paste. Copy the invite code first.';

function spelled(code: string): string {
  return code.split('').join(' ');
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
 * Typing, pasting into the field and the Paste button all go through
 * `sanitizeInviteCode`, so a code copied with its space keeps all eight
 * characters.
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
  const [focused, setFocused] = useState(autoFocus);
  const [pasteEmpty, setPasteEmpty] = useState(false);
  const chars = useMemo(
    () => Array.from({ length: INVITE_CODE_LENGTH }, (_, i) => value[i] ?? ''),
    [value],
  );
  // The caret sits in the next empty box; a complete code has none.
  const activeIndex = value.length < INVITE_CODE_LENGTH ? value.length : -1;

  const onType = (text: string) => {
    setPasteEmpty(false);
    onChangeText(sanitizeInviteCode(text));
  };

  const onPaste = async () => {
    let text = '';
    try {
      text = await Clipboard.getStringAsync();
    } catch {
      // No clipboard access: nothing to paste.
    }
    const code = sanitizeInviteCode(text);
    setPasteEmpty(code.length === 0);
    if (!code) {
      AccessibilityInfo.announceForAccessibility(NOTHING_TO_PASTE);
      return;
    }
    onChangeText(code);
    AccessibilityInfo.announceForAccessibility(`Pasted ${spelled(code)}`);
    if (code.length < INVITE_CODE_LENGTH) inputRef.current?.focus();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit invite code"
        accessibilityValue={{ text: value ? spelled(value) : 'empty' }}
        onPress={() => inputRef.current?.focus()}
        style={styles.codeRow}
      >
        {[0, 1].map((group) => (
          <View key={group} style={[styles.codeGroup, group === 1 && styles.codeGroupSpaced]}>
            {chars.slice(group * 4, group * 4 + 4).map((char, index) => {
              const slotIndex = group * 4 + index;
              const isActive = focused && slotIndex === activeIndex;
              const isFilled = char.length > 0;
              return (
                <View
                  key={slotIndex}
                  style={[
                    styles.codeBox,
                    {
                      backgroundColor: colors.paper,
                      borderWidth: isActive || isFilled ? 2 : 1.5,
                      borderColor: isActive ? colors.airmailBlue : isFilled ? colors.ink : colors.fieldBorder,
                    },
                  ]}
                >
                  <AppText role="codeBox" style={{ color: colors.ink }}>
                    {char}
                  </AppText>
                  {isActive ? <View style={[styles.caret, { backgroundColor: colors.airmailBlue }]} /> : null}
                </View>
              );
            })}
          </View>
        ))}
      </Pressable>
      {/* No maxLength: it would cut a pasted "ABCD EFGH" before the space is dropped. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="Invite code"
        style={styles.hiddenInput}
        autoFocus={autoFocus}
        onSubmitEditing={() => onSubmit?.()}
      />
      <View style={styles.pasteRow}>
        <Button
          label="Paste"
          variant="quiet"
          size="sm"
          leading={(color) => <ClipboardPaste size={18} color={color} strokeWidth={iconStrokeWidth} />}
          onPress={onPaste}
        />
        {pasteEmpty ? (
          <AppText role="bodySm" tone="secondary" accessibilityRole="alert" style={styles.pasteHint}>
            {NOTHING_TO_PASTE}
          </AppText>
        ) : null}
      </View>
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  codeRow: { flexDirection: 'row', marginTop: spacing.s9, width: '100%', maxWidth: 344 },
  codeGroup: { flex: 1, flexDirection: 'row', gap: 6 },
  codeGroupSpaced: { marginLeft: 12 },
  codeBox: {
    flex: 1,
    maxWidth: 36,
    height: 54,
    borderRadius: radius.codeBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: {
    position: 'absolute',
    bottom: 9,
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  pasteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s5, marginTop: spacing.s5 },
  pasteHint: { flex: 1 },
});
