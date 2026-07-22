import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSignedUrl } from '@/lib/supabase/storage';
import { useTheme } from '@/theme';

/** Cover banner for a trip card; quiet placeholder while the URL resolves. */
export function TripCoverImage({ tripId, path }: { tripId: string; path: string }) {
  const { colors } = useTheme();
  const url = useSignedUrl('trip-covers', path);

  return (
    <View style={[styles.cover, { backgroundColor: colors.surface.sunken }]}>
      {url.data ? (
        <Image
          source={{ uri: url.data }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityLabel={`Cover photo, trip ${tripId}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 120,
    width: '100%',
  },
});
