import { StyleSheet, View } from 'react-native';
import { AirmailStripes } from './airmail/AirmailBorder';
import { AppText } from './AppText';
import { radius, useTheme } from '@/theme';

/** The airmail square: stripes, a paper inset, and a "W". */
export function BrandMark({ size = 26 }: { size?: number }) {
  const { colors } = useTheme();
  const pad = 3;
  return (
    <View
      accessibilityLabel="Waymark"
      style={[
        styles.mark,
        { width: size, height: size, padding: pad, borderRadius: radius.brandOuter },
      ]}
    >
      <AirmailStripes size="brand" />
      <View
        style={[
          styles.inset,
          {
            borderRadius: radius.brandInner,
            backgroundColor: colors.paper,
          },
        ]}
      >
        <AppText role="brandLetter" style={{ color: colors.ink }}>
          W
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    overflow: 'hidden',
  },
  inset: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});