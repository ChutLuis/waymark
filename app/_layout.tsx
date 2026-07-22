import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  useFonts,
} from '@expo-google-fonts/newsreader';
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
} from '@expo-google-fonts/source-sans-3';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { useMyProfile } from '@/features/auth/hooks';
import { setPendingInviteCode, takePendingInviteCode } from '@/features/invites/pendingInvite';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// Feed device connectivity into TanStack Query so cached data is served
// while offline instead of hammering retries (STATE-2). Web uses the
// built-in browser online/offline events.
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected === true)),
  );
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Pulls the ?code= out of a …/join deep link, ignoring any other URL. */
function inviteCodeFromUrl(url: string | null): string | null {
  if (!url) return null;
  const parsed = Linking.parse(url);
  const path = (parsed.path ?? '').replace(/^\/+/, '');
  if (path.split('/').pop() !== 'join') return null;
  const code = parsed.queryParams?.code;
  return typeof code === 'string' ? code.toUpperCase() : null;
}

function RootStack() {
  const { scheme, colors } = useTheme();
  const router = useRouter();
  const { session, isRestoring } = useAuth();
  const profile = useMyProfile();

  // An invite deep link (…/join?code=XXXX) tapped while signed out is bounced
  // to /sign-in by the (app) guard, discarding the code. Capture it at the root
  // (before that guard) on both cold start and warm foreground, then replay it
  // once the session and profile exist so /join opens pre-filled (INV-2 / B1).
  useEffect(() => {
    const capture = (url: string | null) => {
      const code = inviteCodeFromUrl(url);
      if (code) setPendingInviteCode(code);
    };
    Linking.getInitialURL().then(capture);
    const sub = Linking.addEventListener('url', ({ url }) => capture(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isRestoring || !session) return;
    if (profile.isPending || profile.data == null) return;
    const code = takePendingInviteCode();
    if (code) router.replace(`/join?code=${code}` as never);
  }, [isRestoring, session, profile.isPending, profile.data, router]);

  // A tapped reminder routes to its trip (REM-3).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const tripId = response.notification.request.content.data?.tripId;
      if (typeof tripId === 'string') {
        router.push(`/trips/${tripId}` as never);
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface.bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
