import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from './AppText';
import { fontFamilies, radius, useTheme } from '@/theme';
import { initials } from '@/lib/format/date';
import { useSignedUrl } from '@/lib/supabase/storage';
import type { Profile } from '@/lib/types';

interface AvatarProps {
  name: string;
  /** avatars-bucket object path; initials render while it loads or when unset. */
  avatarPath?: string | null;
  size?: number;
  /** Owner / first member: ink fill with a paper ring. Others: outlined. */
  filled?: boolean;
  /** Ring color matching the surface behind an overlapping stack. */
  ringColor?: string;
}

export function Avatar({
  name,
  avatarPath = null,
  size = 36,
  filled = true,
  ringColor,
}: AvatarProps) {
  const { colors } = useTheme();
  const photoUrl = useSignedUrl('avatars', avatarPath);
  const fontSize = Math.max(9, Math.round(size * 0.42));
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: filled ? colors.ink : colors.paper,
        },
        !filled && { borderWidth: 2, borderColor: colors.ink },
        ringColor ? { borderWidth: 3, borderColor: ringColor } : null,
      ]}
    >
      <AppText
        style={{
          fontFamily: fontFamilies.bold,
          fontSize,
          lineHeight: Math.round(fontSize * 1.2),
          color: filled ? colors.paper : colors.ink,
        }}
      >
        {initials(name)}
      </AppText>
      {photoUrl.data ? (
        <Image
          source={{ uri: photoUrl.data }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          contentFit="cover"
          transition={100}
        />
      ) : null}
    </View>
  );
}

interface AvatarStackProps {
  profiles: Profile[];
  size?: number;
  /** Background the stack sits on, used for the separating ring. */
  surfaceColor: string;
}

export function AvatarStack({ profiles, size = 36, surfaceColor }: AvatarStackProps) {
  return (
    <View
      style={styles.stack}
      accessibilityLabel={`Members: ${profiles.map((p) => p.displayName).join(', ')}`}
    >
      {profiles.map((profile, index) => (
        <View key={profile.id} style={index > 0 ? styles.overlap : null}>
          <Avatar
            name={profile.displayName}
            avatarPath={profile.avatarPath}
            size={size}
            filled={index === 0}
            ringColor={surfaceColor}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlap: {
    marginLeft: -6,
  },
});