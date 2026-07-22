import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/StateViews';
import { useTheme } from '@/theme';

export default function NotFound() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.bg }}>
      <EmptyState
        title="This page wandered off"
        body="The link points somewhere that does not exist."
        actionLabel="Go home"
        onAction={() => router.replace('/')}
      />
    </View>
  );
}
