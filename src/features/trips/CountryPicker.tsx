import { useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { TextField } from '@/components/TextField';
import { hairlineWidth, hitTargetMin, iconSizes, iconStrokeWidth, radius, spacing, useTheme } from '@/theme';
import { haptic } from '@/lib/haptics';
import { COUNTRIES, countrySections, findCountry, searchCountries, type CountryOption, type CountrySection } from './countries';
import { CountryStamp } from './CountryField';

interface CountryPickerProps {
  value: string;
  onSelect: (destination: string) => void;
}

const COUNTRY_NAME_LINES = 2;
const ALL_SECTIONS = countrySections(COUNTRIES);

/**
 * Every country, A to Z under letter headings, with search across all of
 * them by name, alias or two-letter code.
 */
export function CountryPicker({ value, onSelect }: CountryPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const isSearching = query.trim().length > 0;
  // One untitled section of ranked results; none at all shows the empty state.
  const sections = useMemo<readonly CountrySection[]>(() => {
    if (!isSearching) return ALL_SECTIONS;
    const results = searchCountries(query);
    return results.length > 0 ? [{ title: '', data: results }] : [];
  }, [isSearching, query]);
  const selected = findCountry(value);
  const hasDestination = value.trim().length > 0;

  const choose = (destination: string) => {
    Keyboard.dismiss();
    haptic('selection');
    onSelect(destination);
  };

  const renderCountry = ({ item }: { item: CountryOption }) => {
    const isSelected = selected?.code === item.code;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityState={{ selected: isSelected }}
        onPress={() => choose(item.name)}
        style={({ pressed }) => [
          styles.country,
          { backgroundColor: isSelected || pressed ? colors.bg : colors.paper, borderBottomColor: colors.hairline },
        ]}
      >
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <CountryStamp country={item} />
        </View>
        <View style={styles.countryCopy}>
          <AppText role="body" numberOfLines={COUNTRY_NAME_LINES}>{item.name}</AppText>
        </View>
        {isSelected ? <Check size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} /> : null}
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: CountrySection }) =>
    section.title ? (
      <View
        accessibilityRole="header"
        style={[styles.sectionHeader, { backgroundColor: colors.bg, borderBottomColor: colors.hairline }]}
      >
        <AppText role="kickerSm" tone="secondary">{section.title}</AppText>
      </View>
    ) : null;

  return (
    <View style={styles.screen}>
      <AppText role="bodySm" tone="secondary">
        {`All ${COUNTRIES.length} countries, A to Z. Search by name or two-letter code.`}
      </AppText>
      <TextField
        label="FIND A COUNTRY"
        placeholder="Search any country or code"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={Keyboard.dismiss}
        trailing={query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear country search"
            onPress={() => setQuery('')}
            style={styles.clearSearch}
          >
            <X size={iconSizes.md} color={colors.ink2} strokeWidth={iconStrokeWidth} />
          </Pressable>
        ) : <Search size={iconSizes.md} color={colors.ink2} strokeWidth={iconStrokeWidth} />}
      />
      <SectionList<CountryOption, CountrySection>
        testID="country-list"
        sections={sections}
        keyExtractor={(item) => item.code}
        extraData={selected?.code}
        renderItem={renderCountry}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        style={[styles.list, { backgroundColor: colors.paper }]}
        initialNumToRender={14}
        maxToRenderPerBatch={12}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
        ListHeaderComponent={!isSearching ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decide on a country later"
            accessibilityState={{ selected: !hasDestination }}
            onPress={() => choose('')}
            style={({ pressed }) => [
              styles.later,
              { borderBottomColor: colors.hairline, backgroundColor: pressed ? colors.bg : colors.paper },
            ]}
          >
            <View style={styles.countryCopy}>
              <AppText role="body" numberOfLines={1}>Decide later</AppText>
              <AppText role="metaSm" tone="secondary" numberOfLines={1}>You can add a country any time.</AppText>
            </View>
            {!hasDestination ? <Check size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} /> : null}
          </Pressable>
        ) : null}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <AppText role="rowTitle">No countries found</AppText>
            <AppText role="bodySm" tone="secondary">Try another name or a two-letter country code.</AppText>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, gap: spacing.s6 },
  list: { flex: 1, minHeight: 0, borderRadius: radius.card },
  sectionHeader: {
    paddingVertical: spacing.s1,
    paddingHorizontal: spacing.s5,
    borderBottomWidth: hairlineWidth,
  },
  country: {
    minHeight: hitTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s5,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s5,
    borderBottomWidth: hairlineWidth,
  },
  countryCopy: { flex: 1, minWidth: 0 },
  later: {
    minHeight: hitTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s5,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s5,
    borderBottomWidth: hairlineWidth,
  },
  clearSearch: { minWidth: hitTargetMin, minHeight: hitTargetMin, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: spacing.s7, gap: spacing.s3 },
});
