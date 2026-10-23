import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { hitTargetMin, iconStrokeWidth, radius, spacing, useTheme } from '@/theme';
import { SUPPORT_EMAIL } from '@/lib/legal';

/**
 * Public account-deletion page for the web build (Google Play asks for a web
 * route where people can request deletion; the static copy lives at
 * ACCOUNT_DELETION_URL). The app itself deletes in place from Profile →
 * Delete account; this page explains that path and offers an email fallback
 * for anyone without the app installed.
 */
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
      <ScreenStatusBar band />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* Google Play opens this page cold; with no history, Back goes Home. */}
        <BackButton style={styles.back} />

        <View style={styles.body}>
          <AppText role="kicker" tone="secondary">YOUR ACCOUNT</AppText>
          <AppText role="title" style={styles.title} accessibilityRole="header">
            Delete your account
          </AppText>
          <AppText role="body" tone="secondary" style={styles.intro}>
            Deleting your Waymark account is permanent. Here is what happens, and how to
            do it.
          </AppText>

          <View style={styles.section}>
            <AppText role="rowTitle" accessibilityRole="header">In the app</AppText>
            <AppText role="body" tone="secondary" style={styles.sectionBody}>
              Open your profile, scroll to the bottom, and tap Delete account. Confirm the
              sheet and your account is removed straight away. If it stops part-way, try
              again: it picks up where it left off.
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText role="rowTitle" accessibilityRole="header">What gets deleted</AppText>
            <AppText role="body" tone="secondary" style={styles.sectionBody}>
              Your account, profile, photo and every note you wrote, sealed or shared, plus
              any trip no one else is on (with its itinerary, packing list and notes). A trip
              you own that other people are on stays with them: it passes to the member who
              joined first. The plan and packing items you added to shared trips stay in
              them, without your name. Your reminders are removed from the device you
              delete from.
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText role="rowTitle" accessibilityRole="header">By email</AppText>
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

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/privacy')}
            style={({ pressed }) => [styles.policyLink, pressed && styles.pressed]}
          >
            <AppText role="link" style={styles.policyLabel}>
              Read the privacy policy
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  back: { marginTop: spacing.s2 },
  pressed: { opacity: 0.7 },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  intro: { marginTop: spacing.s3 },
  section: { marginTop: spacing.s9 },
  sectionBody: { marginTop: spacing.s3 },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
    alignSelf: 'flex-start',
    marginTop: spacing.s5,
    minHeight: 48,
    paddingHorizontal: spacing.s8,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  policyLink: { minHeight: hitTargetMin, justifyContent: 'center', alignSelf: 'flex-start', marginTop: spacing.s9 },
  policyLabel: { textDecorationLine: 'underline' },
});
