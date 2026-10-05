import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { fontFamilies, useTheme } from '@/theme';
import { DESTINATION_ART } from './destinationArt';
import { denomination as denomText, DESTINATION_INFO, type CountryKey } from './destinations';

export type StampBand = 'lg' | 'md' | 'sm' | 'xs' | 'mini';

interface BandLayout {
  width: number;
  height: number;
  artW: number;
  artH: number;
  nameStrip: number;
  denomPad: { t: number; r: number; b: number; l: number };
  denomSize: number;
  denomLine: number;
  denomPadH: number;
  nameSize: number;
  nameLine: number;
  nameLs: number;
}

/** Exact stamp geometry per README's stamp table. */
export const STAMP_BANDS: Record<StampBand, BandLayout> = {
  lg: { width: 104, height: 128, artW: 90, artH: 99, nameStrip: 17, denomPad: { t: 2, r: 4, b: 0, l: 0 }, denomSize: 9.5, denomLine: 11, denomPadH: 4, nameSize: 9.5, nameLine: 11, nameLs: 0.8 },
  md: { width: 88, height: 104, artW: 74, artH: 77, nameStrip: 15, denomPad: { t: 1, r: 3, b: 0, l: 0 }, denomSize: 8.5, denomLine: 10, denomPadH: 3, nameSize: 8.5, nameLine: 10, nameLs: 0.8 },
  sm: { width: 80, height: 96, artW: 66, artH: 71, nameStrip: 13, denomPad: { t: 1, r: 3, b: 0, l: 0 }, denomSize: 8, denomLine: 9, denomPadH: 3, nameSize: 8, nameLine: 9, nameLs: 0.5 },
  xs: { width: 56, height: 72, artW: 42, artH: 49, nameStrip: 11, denomPad: { t: 1, r: 2, b: 1, l: 3 }, denomSize: 6.5, denomLine: 8, denomPadH: 2, nameSize: 6.5, nameLine: 8, nameLs: 0.5 },
  mini: { width: 40, height: 48, artW: 38, artH: 46, nameStrip: 0, denomPad: { t: 0, r: 0, b: 0, l: 0 }, denomSize: 0, denomLine: 0, denomPadH: 0, nameSize: 0, nameLine: 0, nameLs: 0 },
};

export const AVATAR_STAMP_SIZES = {
  lg: { width: 80, height: 96, initial: 36, nameSize: 8, nameLine: 9, nameLs: 0.8 },
  md: { width: 64, height: 80, initial: 28, nameSize: 7.5, nameLine: 9, nameLs: 0.8 },
  sm: { width: 40, height: 48, initial: 16, nameSize: 0, nameLine: 0, nameLs: 0 },
} as const;

type AvatarStampSize = keyof typeof AVATAR_STAMP_SIZES;

/** A perforated-name-strip frame shared by every stamp variant. */
function Frame({
  band,
  frame,
  children,
}: {
  band: BandLayout;
  frame: string;
  children: React.ReactNode;
}) {
  return <View style={[styles.frame, { width: band.width, height: band.height, backgroundColor: frame }]}>{children}</View>;
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
  frame?: 'stampPaper' | 'paper' | 'ink';
  /** Fallback initial shown in an ink panel (unknown destination with dates). */
  initial?: string | null;
}

/**
 * A stamp cut from a scene (a still image, never a Lottie), with a denomination
 * chip and a name strip. Falls back to an ink "initial stamp" when the
 * destination is unknown.
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
  const frameColor = frame === 'paper' ? colors.paper : frame === 'ink' ? colors.ink : colors.stampPaper;

  const panel = (
    <View style={[styles.artWindow, { width: layout.artW, height: layout.artH, backgroundColor: colors.artPlaceholder, marginTop: 2, marginHorizontal: 2 }]}>
      {image ? (
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.ink }]}>
          <Text style={{ fontFamily: fontFamilies.extrabold, fontSize: layout.artH * 0.5, lineHeight: layout.artH * 0.6, color: colors.paper }}>
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
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: layout.denomSize, lineHeight: layout.denomLine, color: colors.ink }}>
            {denomination}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Frame band={layout} frame={frameColor}>
      {panel}
      {layout.nameStrip > 0 ? (
        <View style={{ height: layout.nameStrip, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fontFamilies.mono, fontSize: layout.nameSize, lineHeight: layout.nameLine, letterSpacing: layout.nameLs, color: colors.ink }}
          >
            {name ?? ''}
          </Text>
        </View>
      ) : null}
    </Frame>
  );
}

/** Avatar stamp: ink panel with the person's initial and a name strip. */
export function AvatarStamp({
  size,
  initial,
  name,
  frame = 'stampPaper',
  imageUri = null,
}: {
  size: AvatarStampSize;
  initial: string;
  name?: string | null;
  frame?: 'stampPaper' | 'paper';
  /** Local or signed photo URI; shown inside the panel when present. */
  imageUri?: string | null;
}) {
  const { colors } = useTheme();
  const dims = AVATAR_STAMP_SIZES[size];
  const frameColor = frame === 'paper' ? colors.paper : colors.stampPaper;
  const pad = size === 'sm' ? 1 : 5;
  const nameStrip = size === 'sm' ? 0 : 13;
  return (
    <View style={[styles.frame, { width: dims.width, height: dims.height, padding: pad, backgroundColor: frameColor }]}>
      <View style={[styles.artWindow, styles.center, { flex: 1, backgroundColor: colors.ink }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Text style={{ fontFamily: fontFamilies.extrabold, fontSize: dims.initial, lineHeight: dims.initial * 1.2, color: colors.paper }}>
            {initial}
          </Text>
        )}
      </View>
      {nameStrip > 0 ? (
        <View style={{ height: nameStrip, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: dims.nameSize, lineHeight: dims.nameLine, letterSpacing: dims.nameLs, color: colors.ink }}>
            {name ?? ''}
          </Text>
        </View>
      ) : null}
    </View>
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
  frame?: 'stampPaper' | 'paper' | 'ink';
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
  frame: {
    flexDirection: 'column',
  },
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