import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { PerforatedStamp, type StampSize } from '@/components/airmail/PerforatedStamp';
import { useSignedUrl } from '@/lib/supabase/storage';
import { fontFamilies, useTheme } from '@/theme';
import { DESTINATION_ART, NEUTRAL_STAMP_STILL } from './destinationArt';
import { denomination as denomText, DESTINATION_INFO, type CountryKey } from './destinations';

export type StampBand = 'lg' | 'md' | 'sm' | 'xs' | 'mini';

interface BandLayout {
  width: number;
  height: number;
  artW: number;
  artH: number;
  nameStrip: number;
  /** Perforation profile. */
  size: StampSize;
  denomPad: { t: number; r: number; b: number; l: number };
  denomSize: number;
  denomLine: number;
  nameSize: number;
  nameLine: number;
  nameLs: number;
}

/** Exact stamp geometry per README's stamp table (art windows) + the override. */
export const STAMP_BANDS: Record<StampBand, BandLayout> = {
  lg: { width: 104, height: 128, artW: 90, artH: 99, nameStrip: 17, size: 'lg', denomPad: { t: 2, r: 4, b: 0, l: 0 }, denomSize: 9.5, denomLine: 11, nameSize: 9.5, nameLine: 11, nameLs: 0.8 },
  md: { width: 88, height: 104, artW: 74, artH: 77, nameStrip: 15, size: 'md', denomPad: { t: 1, r: 3, b: 0, l: 0 }, denomSize: 8.5, denomLine: 10, nameSize: 8.5, nameLine: 10, nameLs: 0.8 },
  sm: { width: 80, height: 96, artW: 66, artH: 71, nameStrip: 13, size: 'sm', denomPad: { t: 1, r: 3, b: 0, l: 0 }, denomSize: 8, denomLine: 9, nameSize: 8, nameLine: 9, nameLs: 0.5 },
  xs: { width: 56, height: 72, artW: 42, artH: 49, nameStrip: 11, size: 'xs', denomPad: { t: 1, r: 2, b: 1, l: 3 }, denomSize: 6.5, denomLine: 8, nameSize: 6.5, nameLine: 8, nameLs: 0.5 },
  mini: { width: 40, height: 48, artW: 28, artH: 36, nameStrip: 0, size: 'mini', denomPad: { t: 0, r: 0, b: 0, l: 0 }, denomSize: 0, denomLine: 0, nameSize: 0, nameLine: 0, nameLs: 0 },
};

export const AVATAR_STAMP_SIZES = {
  lg: { width: 80, height: 96, initial: 36, nameSize: 8, nameLine: 9, nameLs: 0.8 },
  md: { width: 64, height: 80, initial: 28, nameSize: 7.5, nameLine: 9, nameLs: 0.8 },
  sm: { width: 40, height: 48, initial: 16, nameSize: 0, nameLine: 0, nameLs: 0 },
} as const;

type AvatarStampSize = keyof typeof AVATAR_STAMP_SIZES;

/** Paste/pane-relative art margins: 2 inside the padding (1 on the 40x48). */
function artMargin(layout: BandLayout): number {
  return layout.size === 'mini' ? 1 : 2;
}

interface ArtStampProps {
  band: StampBand;
  /** Scene art still (from the destination's art), or null → initials/slot. */
  image?: ReturnType<typeof require> | null;
  /** Denomination chip text, e.g. "11 DÍAS". */
  denomination?: string | null;
  /** Name strip text, e.g. GUATEMALA. */
  name?: string | null;
  /** Frame tone: white for art stamps, paper on the trips-list header. */
  /** Frame tone. Always stamp paper in both themes (correction 3). */
  frame?: 'stampPaper' | 'ink';
  /** Fallback initial shown in an ink panel (unknown destination with dates). */
  initial?: string | null;
}

/**
 * A stamp cut from a scene (a still image, never a Lottie), with a denomination
 * chip and a name strip, built on the perforated frame. Falls back to an ink
 * "initial stamp" when the destination is unknown.
 */
export function SceneStamp({
  band,
  image = null,
  denomination = null,
  name = null,
  frame = 'stampPaper',
  initial = null,
}: ArtStampProps) {
  const { colors } = useTheme();
  const layout = STAMP_BANDS[band];
  const margin = artMargin(layout);

  const panel = (
    <View
      style={[
        styles.artWindow,
        {
          width: layout.artW,
          height: layout.artH,
          backgroundColor: colors.artPlaceholder,
          marginTop: margin,
          marginHorizontal: margin,
        },
      ]}
    >
      {image ? (
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.stampInk }]}>
          <Text style={{ fontFamily: fontFamilies.extrabold, fontSize: layout.artH * 0.5, lineHeight: layout.artH * 0.6, color: colors.stampPaper }}>
            {initial ?? '?'}
          </Text>
        </View>
      )}
      {denomination && layout.denomSize > 0 ? (
        <View
          style={[
            styles.denom,
            {
              paddingTop: layout.denomPad.t,
              paddingRight: layout.denomPad.r,
              paddingBottom: layout.denomPad.b,
              paddingLeft: layout.denomPad.l,
              backgroundColor: colors.stampPaper,
            },
          ]}
        >
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: layout.denomSize, lineHeight: layout.denomLine, color: colors.stampInk }}>
            {denomination}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <PerforatedStamp width={layout.width} height={layout.height} size={layout.size} tone={frame}>
      {panel}
      {layout.nameStrip > 0 ? (
        <View style={{ height: layout.nameStrip, alignItems: 'center', justifyContent: 'center' }}>
          {/* No numberOfLines: Android mis-measures mono text with letter
              spacing and clips names that fit. Uppercased here so every caller
              prints the same. */}
          <Text
            style={{ fontFamily: fontFamilies.mono, fontSize: layout.nameSize, lineHeight: layout.nameLine, letterSpacing: layout.nameLs, color: colors.stampInk }}
          >
            {(name ?? '').toUpperCase()}
          </Text>
        </View>
      ) : null}
    </PerforatedStamp>
  );
}

/** Avatar stamp: ink panel with the person's initial and a name strip. */
export function AvatarStamp({
  size,
  initial,
  name,
  frame = 'stampPaper',
  imageUri = null,
  avatarPath = null,
}: {
  size: AvatarStampSize;
  initial: string;
  name?: string | null;
  frame?: 'stampPaper';
  /** Local or already-signed photo URI; wins over `avatarPath`. */
  imageUri?: string | null;
  /** avatars-bucket object path; resolved to a signed URL. */
  avatarPath?: string | null;
}) {
  const { colors } = useTheme();
  const signed = useSignedUrl('avatars', imageUri ? null : avatarPath);
  const resolvedImage = imageUri ?? signed.data ?? null;
  const dims = AVATAR_STAMP_SIZES[size];
  const layout = STAMP_BANDS[size === 'lg' ? 'sm' : size === 'md' ? 'xs' : 'mini'];
  const perforation: StampSize = size === 'lg' ? 'sm' : size === 'md' ? 'xs' : 'mini';
  const margin = artMargin(layout);
  return (
    <PerforatedStamp width={dims.width} height={dims.height} size={perforation} tone={frame}>
      <View
        style={[
          styles.artWindow,
          styles.center,
          {
            width: layout.artW,
            height: layout.artH,
            marginTop: margin,
            marginHorizontal: margin,
            backgroundColor: colors.stampInk,
          },
        ]}
      >
        {resolvedImage ? (
          <Image source={{ uri: resolvedImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Text style={{ fontFamily: fontFamilies.extrabold, fontSize: dims.initial, lineHeight: dims.initial * 1.2, color: colors.stampPaper }}>
            {initial}
          </Text>
        )}
      </View>
      {dims.nameSize > 0 ? (
        <View style={{ height: layout.nameStrip, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: dims.nameSize, lineHeight: dims.nameLine, letterSpacing: dims.nameLs, color: colors.stampInk }}>
            {(name ?? '').toUpperCase()}
          </Text>
        </View>
      ) : null}
    </PerforatedStamp>
  );
}

/**
 * Small decorative stamp: a static still of the confirmed stop stamp
 * (30x35). The confirmed stills are bundled per destination; unknown
 * destinations fall back to the neutral `00-airmail` still.
 */
export function StampStill({
  country,
  width = 30,
  height = 35,
}: {
  country: CountryKey | null;
  width?: number;
  height?: number;
}) {
  const source = country ? DESTINATION_ART[country].stampStill : NEUTRAL_STAMP_STILL;
  return (
    <Image
      source={source}
      style={{ width, height }}
      contentFit="contain"
      accessibilityLabel="Stamp"
    />
  );
}

/** Convenience: a destination art stamp with its denomination printed. */
export function DestinationStamp({
  country,
  band,
  days,
  frame,
  coverImagePath,
}: {
  country: CountryKey | null;
  band: StampBand;
  days: number;
  /** Frame tone. Always stamp paper in both themes (correction 3). */
  frame?: 'stampPaper' | 'ink';
  /** Cover photo still path wins (resolved by the caller to an image source). */
  coverImagePath?: ReturnType<typeof require> | null;
}) {
  if (!country) return null;
  const art = DESTINATION_ART[country];
  const info = DESTINATION_INFO[country];
  return (
    <SceneStamp
      band={band}
      image={coverImagePath ?? art.sceneStampStill}
      denomination={days > 0 ? denomText(country, days) : null}
      name={info.stampName}
      frame={frame}
    />
  );
}

const styles = StyleSheet.create({
  artWindow: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  denom: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});