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
  /** Alternates fill between members so adjacent avatars stay distinct. */
  toneIndex?: number;
  /** Ring color matching the surface behind an overlapping stack. */
  ringColor?: string;
}

export function Avatar({ name, avatarPath = null, size = 30, toneIndex = 0, ringColor }: AvatarProps) {
  const { colors } = useTheme();
  const photoUrl = useSignedUrl('avatars', avatarPath);
  const fontSize = Math.max(9, Math.round(size * 0.4));
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: toneIndex % 2 === 0 ? colors.avatar.bg : colors.avatar.bgAlt,
        },
        ringColor ? { borderWidth: 2, borderColor: ringColor } : null,
      ]}
    >
      <AppText
        style={{
          fontFamily: fontFamilies.textSemiBold,
          fontSize,
          lineHeight: Math.round(fontSize * 1.2),
          color: colors.avatar.text,
        }}
      >
        {initials(name)}
      </AppText>
      {photoUrl.data ? (
        <Image
          source={{ uri: photoUrl.data }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]}
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

export function AvatarStack({ profiles, size = 30, surfaceColor }: AvatarStackProps) {
  return (
    <View style={styles.stack} accessibilityLabel={`Members: ${profiles.map((p) => p.displayName).join(', ')}`}>
      {profiles.map((profile, index) => (
        <View key={profile.id} style={index > 0 ? { marginLeft: -8 } : null}>
          <Avatar
            name={profile.displayName}
            avatarPath={profile.avatarPath}
            size={size}
            toneIndex={index}
            ringColor={surfaceColor}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
