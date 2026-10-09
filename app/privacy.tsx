import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { fontFamilies, spacing, useTheme } from '@/theme';

/** The sections of the note. Copy is generic and matches the shipped model. */
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'What we keep',
    body:
      'Your name, email and photo, the trips you belong to, their itinerary and packing list, and any notes you write. A trip stores what you and the people you travel with put in it.',
  },
  {
    heading: 'Postcards and sealed notes',
    body:
      'Postcards are shared with the other members of that trip. Sealed notes are private: only you can open them. That is enforced by the database, not just the screen, so another member cannot read your sealed notes even if they ask for them directly.',
  },
  {
    heading: 'Who can see a trip',
    body:
      'Only the people you invite into a trip can see it. Invites are single-use and expire, and you can leave a trip at any time. Nothing is shared between trips.',
  },
  {
    heading: 'No tracking, no ads',
    body:
      'We do not run analytics, advertising or third-party trackers. The only people who see your trips are the people in them.',
  },
  // Account deletion is built and verified locally, but the delete-account Edge
  // Function is not yet deployed to a hosted project. This note only describes
  // what is live, so it keeps the trip-deletion sentence until the deploy lands
  // (then restore the account-deletion wording).
  {
    heading: 'Removing your data',
    body:
      'You can delete a trip you own, which removes its itinerary, packing list and notes.',
  },
];

/** A short, generic privacy note reached from sign-up and Profile. */
export default function PrivacyNoteScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isWide = width >= 720;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenStatusBar />
      {/* Pin a page-coloured bar over the status-bar area so scrolled content
          never shows through behind the clock (N18). */}
      <View style={[styles.statusBar, { height: insets.top, backgroundColor: colors.bg }]} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2.2} />
          <AppText style={styles.backLabel}>Back</AppText>
        </Pressable>

        <View style={styles.body}>
          <AppText role="kicker" tone="secondary">PRIVACY NOTE</AppText>
          <AppText role="title" style={styles.title}>
            How your data is kept
          </AppText>
          <AppText role="body" tone="secondary" style={styles.intro}>
            Waymark is built for a small group planning a trip together. Here is
            what that means for your data, in plain language.
          </AppText>

          {SECTIONS.map((section) => (
            <View key={section.heading} style={styles.section}>
              <AppText role="rowTitle">{section.heading}</AppText>
              <AppText role="body" tone="secondary" style={styles.sectionBody}>
                {section.body}
              </AppText>
            </View>
          ))}

          <AppText role="bodySm" tone="muted" style={styles.footer}>
            This note describes how the app is built today. If it changes, the
            update lands here.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  content: { paddingBottom: 0 },
  contentWide: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  backRow: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8, marginTop: 6 },
  backLabel: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  intro: { marginTop: spacing.s3 },
  section: { marginTop: spacing.s9 },
  sectionBody: { marginTop: spacing.s3 },
  footer: { marginTop: spacing.s12 },
});
