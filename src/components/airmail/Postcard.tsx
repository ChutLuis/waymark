import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../AppText';
import { radius, shadows, useTheme } from '@/theme';

interface PostcardProps {
  children: ReactNode;
  /** 6 by default; 7 on the front sign-in and join cards. */
  padding?: number;
  /** Slight rotation in degrees. */
  rotation?: number;
  /** Caption chip text. */
  caption?: string;
  /** Corner the caption sits in. */
  captionCorner?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  /** Shadow token variant. */
  shadow?: 'postcard' | 'postcardFront' | 'postcardJoin';
  style?: StyleProp<ViewStyle>;
  width?: number | `${number}%`;
  height?: number;
}

/** A white-framed photo postcard with an optional corner caption chip. */
export function Postcard({
  children,
  padding = 6,
  rotation = 0,
  caption,
  captionCorner = 'bottomLeft',
  shadow = 'postcard',
  style,
  width,
  height,
}: PostcardProps) {
  const { colors } = useTheme();
  const cornerStyle = {
    topLeft: { top: 6, left: 6 },
    topRight: { top: 6, right: 6 },
    bottomLeft: { bottom: 6, left: 6 },
    bottomRight: { bottom: 6, right: 6 },
  }[captionCorner];

  return (
    <View
      style={[
        styles.frame,
        { padding, backgroundColor: colors.stampPaper, boxShadow: shadows[shadow] },
        rotation ? { transform: [{ rotate: `${rotation}deg` }] } : null,
        width !== undefined ? { width } : null,
        height !== undefined ? { height } : null,
        style,
      ]}
    >
      <View style={styles.art}>{children}</View>
      {caption ? (
        <View style={[styles.caption, cornerStyle, { backgroundColor: colors.paper }]}>
          <AppText role="caption" style={{ color: colors.ink }}>
            {caption}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.airmailInner,
    overflow: 'hidden',
  },
  art: {
    flex: 1,
    borderRadius: radius.airmailInner,
    overflow: 'hidden',
  },
  caption: {
    position: 'absolute',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radius.chip,
  },
});