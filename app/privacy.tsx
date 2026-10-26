import { Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExternalLink, Mail } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { hitTargetMin, iconSizes, iconStrokeWidth, spacing, useTheme } from '@/theme';
import {
  ACCOUNT_DELETION_URL,
  OPERATOR_NAME,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
} from '@/lib/legal';

type Block = { text: string } | { list: string[] };
type LinkKind = 'email' | 'deletionPage' | 'policyPage';

interface Section {
  heading: string;
  blocks: Block[];
  links?: LinkKind[];
}

/**
 * The policy, in plain language. It describes the shipped data model; keep it
 * in step with the public copy at PRIVACY_POLICY_URL.
 */
const SECTIONS: Section[] = [
  {
    heading: 'Who runs Waymark',
    blocks: [
      {
        text: `Waymark is a shared trip planner, made and run by ${OPERATOR_NAME}, who is responsible for the data described here. For questions, requests or complaints, email ${SUPPORT_EMAIL}.`,
      },
    ],
    links: ['email'],
  },
  {
    heading: 'What we collect',
    blocks: [
      { text: 'Only what the planner needs to work:' },
      {
        list: [
          'Your account: your email address and your password. The password is kept only as a one-way hash by our sign-in provider; nobody can read it back.',
          'Your profile: the display name you choose and, if you add one, an avatar photo.',
          'Your trips: their names, destinations, dates and cover photos.',
          'What you plan together: itinerary stops (title, place, times, notes and status), and packing items with their quantities, who they’re assigned to and whether they’re packed.',
          'Notes: shared postcards and private sealed notes.',
          'Invites: the invite codes you create, when they expire, and when and by whom they were used.',
          'Sign-in records: like any online service, our provider’s servers log technical details such as IP address, device or browser type and sign-in times, to keep accounts secure.',
        ],
      },
      {
        text: 'Kept only on your device and never sent to us: your trip reminders (their times and the on/off setting) and your appearance setting. So Waymark works offline, it also keeps a copy of your trips (never the text of private notes) and any changes not yet sent on the device; signing out deletes them.',
      },
    ],
  },
  {
    heading: 'Why we use it',
    blocks: [
      {
        text: 'To run Waymark for you: to create your account and sign you in, to show your trips to you and the people you invite, to keep everyone’s plans in sync, and to send the emails you ask for, such as a password reset link.',
      },
      {
        text: 'We don’t show ads, we don’t sell or rent your data, and the app has no analytics, advertising or tracking tools.',
      },
    ],
  },
  {
    heading: 'Who can see what',
    blocks: [
      {
        list: [
          'People on a trip with you see your display name and avatar, and everything shared on that trip: its details, the itinerary, the packing list (including what’s assigned to you) and postcards.',
          'A sealed note can be read only by the person who wrote it: not the other members, not the trip’s owner. The database enforces this, not just the app.',
          'Other members never see your email address.',
          'Nobody outside a trip can see it. Invite codes are single-use and expire.',
        ],
      },
    ],
  },
  {
    heading: 'Who processes your data',
    blocks: [
      {
        text: 'Waymark is hosted on Supabase, which provides our sign-in, database and file storage and handles your data only on our behalf. Everything travels between the app and Supabase encrypted with TLS. Reminders are scheduled by your phone itself; no push service is involved.',
      },
    ],
  },
  {
    heading: 'How long we keep it',
    blocks: [
      {
        text: 'We keep your data for as long as you have an account. You can change your name and photo, and delete trips you own, at any time.',
      },
      { text: 'When you delete your account:' },
      {
        list: [
          'Your account, profile, avatar and every note you wrote, sealed or shared, are erased.',
          'A trip you own that has other members passes to the member who joined it first, with everything in it.',
          'A trip only you are on is deleted, with everything in it.',
          'Itinerary stops and packing items you added to shared trips stay there for the others, but no longer show who added them.',
          'Your reminders, your sign-in and the offline copy of your trips are removed from the device you deleted from.',
        ],
      },
      {
        text: 'Deleted data can remain for a short time in our provider’s routine backups until those are replaced.',
      },
    ],
  },
  {
    heading: 'Deleting your account',
    blocks: [
      { text: 'In the app: open Profile and tap Delete account. It takes effect straight away.' },
      {
        text: `Without the app: follow the steps at ${ACCOUNT_DELETION_URL}, or email ${SUPPORT_EMAIL} from the address on your account and we’ll delete it for you.`,
      },
    ],
    links: ['deletionPage', 'email'],
  },
  {
    heading: 'Your rights',
    blocks: [
      {
        text: `You can ask us for a copy of your data, ask us to correct or delete it, and object to how it’s used: email ${SUPPORT_EMAIL}. Depending on where you live, you can also complain to your local data protection authority.`,
      },
    ],
  },
  {
    heading: 'Children',
    blocks: [
      {
        text: 'Waymark isn’t directed at children under 13, and we don’t knowingly collect their data. If you believe a child has an account, email us and we’ll delete it.',
      },
    ],
  },
  {
    heading: 'Changes to this policy',
    blocks: [
      {
        text: `If this policy changes, we’ll update it here and at ${PRIVACY_POLICY_URL}, and change the effective date below. If a change affects how your data is used, we’ll tell you in the app first.`,
      },
    ],
    links: ['policyPage'],
  },
];

const LINKS: Record<LinkKind, { label: string; a11y: string; url: string; icon: 'mail' | 'external' }> = {
  email: {
    label: SUPPORT_EMAIL,
    a11y: `Email ${SUPPORT_EMAIL}`,
    url: `mailto:${SUPPORT_EMAIL}`,
    icon: 'mail',
  },
  deletionPage: {
    label: 'Account deletion page',
    a11y: 'Open the account deletion page',
    url: ACCOUNT_DELETION_URL,
    icon: 'external',
  },
  policyPage: {
    label: 'This policy on the web',
    a11y: 'Open this privacy policy on the web',
    url: PRIVACY_POLICY_URL,
    icon: 'external',
  },
};

function PolicyLink({ kind }: { kind: LinkKind }) {
  const { colors } = useTheme();
  const link = LINKS[kind];
  const Icon = link.icon === 'mail' ? Mail : ExternalLink;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={link.a11y}
      onPress={() => Linking.openURL(link.url).catch(() => {})}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Icon size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} />
      <AppText role="link" style={styles.linkLabel}>
        {link.label}
      </AppText>
    </Pressable>
  );
}

/** Waymark's privacy policy, reached from sign-up and Profile. */
export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenStatusBar band />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <BackButton style={styles.back} />

        <View style={styles.body}>
          <AppText role="kicker" tone="secondary">PRIVACY POLICY</AppText>
          <AppText role="title" style={styles.title} accessibilityRole="header">
            How Waymark handles your data
          </AppText>
          <AppText role="body" tone="secondary" style={styles.intro}>
            What we collect, why, who can see it, and how to delete it, in plain language.
            Effective {PRIVACY_POLICY_EFFECTIVE_DATE}.
          </AppText>

          {SECTIONS.map((section) => (
            <View key={section.heading} style={styles.section}>
              <AppText role="rowTitle" accessibilityRole="header">
                {section.heading}
              </AppText>
              {section.blocks.map((block, index) =>
                'text' in block ? (
                  <AppText key={index} role="body" tone="secondary" style={styles.sectionBody}>
                    {block.text}
                  </AppText>
                ) : (
                  <View key={index} style={styles.list}>
                    {block.list.map((item) => (
                      <View key={item} style={styles.listItem}>
                        <AppText
                          role="body"
                          tone="secondary"
                          accessibilityElementsHidden
                          importantForAccessibility="no"
                        >
                          •
                        </AppText>
                        <AppText role="body" tone="secondary" style={styles.listText}>
                          {item}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ),
              )}
              {section.links?.map((kind) => <PolicyLink key={kind} kind={kind} />)}
            </View>
          ))}

          <AppText role="bodySm" tone="muted" style={styles.footer}>
            Effective {PRIVACY_POLICY_EFFECTIVE_DATE}.
          </AppText>
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
  body: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  title: { marginTop: spacing.s3 },
  intro: { marginTop: spacing.s3 },
  section: { marginTop: spacing.s9 },
  sectionBody: { marginTop: spacing.s3 },
  list: { marginTop: spacing.s3, gap: spacing.s3 },
  listItem: { flexDirection: 'row', gap: spacing.s3 },
  listText: { flex: 1 },
  link: {
    minHeight: hitTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.s3,
    marginTop: spacing.s2,
  },
  linkLabel: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
  footer: { marginTop: spacing.s12 },
});
