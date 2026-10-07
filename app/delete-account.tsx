import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { fontFamilies, iconStrokeWidth, spacing, useTheme } from '@/theme';

/**
 * Public account-deletion page for the web build (Google Play asks for a web
 * route where people can request deletion). The app itself deletes in place
 * from Profile → Delete account; this page explains that path and offers an
 * email fallback for anyone without the app installed.
 */
const SUPPORT_EMAIL = 'support@waymark.app';

export default function DeleteAccountPage() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isWide = width >= 720;
  const [opened, setOpened] = useState(false);

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my Waymark account')}`;

  const onEmail = async () => {
    setOpened(true);
    await Linking.openURL(mailto).catch(() => {});
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2.2} />
          <AppText style={styles.backLabel}>Back</AppText>
        </Pressable>

        <View style={styles.body}>
          <AppText role="kicker" tone="secondary">YOUR ACCOUNT</AppText>
          <AppText role="title" style={styles.title}>Delete your account</AppText>
          <AppText role="body" tone="secondary" style={styles.intro}>
            Deleting your Waymark account is permanent. Here is what happens, and how to
            do it.
          </AppText>

          <View style={styles.section}>
            <AppText role="rowTitle">In the app</AppText>
            <AppText role="body" tone="secondary" style={styles.sectionBody}>
              Open your profile, scroll to the bottom, and tap Delete account. Confirm the
              sheet and your account is removed straight away.
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText role="rowTitle">What gets deleted</AppText>
            <AppText role="body" tone="secondary" style={styles.sectionBody}>
              Your profile and photo, every trip no one else is on (with its itinerary,
              packing list and notes), and every note and item you added. Trips you own
              that other people are on stay with them: they pass to the member who joined
              first.
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText role="rowTitle">By email</AppText>
            <AppText role="body" tone="secondary" style={styles.sectionBody}>
              Don&apos;t have the app installed? Email us from the address on your account
              and we&apos;ll delete it for you.
            </AppText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Email ${SUPPORT_EMAIL} to delete your account`}
              onPress={onEmail}
              style={({ pressed }) => [styles.emailButton, { borderColor: colors.ink }, pressed && styles.pressed]}
            >
              <Mail size={20} color={colors.ink} strokeWidth={iconStrokeWidth} />
              <AppText role="button">{SUPPORT_EMAIL}</AppText>
            </Pressable>
            {opened ? (
              <AppText role="bodySm" tone="muted" style={styles.sectionBody}>
                If nothing opened, email {SUPPORT_EMAIL}.
              </AppText>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  backRow: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
  backLabel: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  intro: { marginTop: spacing.s3 },
  section: { marginTop: spacing.s9 },
  sectionBody: { marginTop: spacing.s3 },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    marginTop: spacing.s5,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 2,
  },
});