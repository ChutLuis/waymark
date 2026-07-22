import { Redirect, Stack } from 'expo-router';
import { LoadingState } from '@/components/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  const { session, isRestoring } = useAuth();

  if (isRestoring) return <LoadingState />;
  if (session) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface.bg },
      }}
    />
  );
}
