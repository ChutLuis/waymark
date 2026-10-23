import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Check, ChevronDown, ChevronRight, ChevronUp, Globe, Search, X } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { useSheetReveal } from '@/components/Sheet';
import { haptic } from '@/lib/haptics';
import { hairlineWidth, hitTargetMin, iconSizes, iconStrokeWidth, radius, shadows, spacing, typeScale, useTheme } from '@/theme';
import { COUNTRIES, ILLUSTRATED_COUNTRIES, countryForDestination, findCountry, searchCountries, type CountryOption } from './countries';
import { DESTINATION_ART } from './destinationArt';
import { SceneStamp, STAMP_BANDS } from './SceneStamp';

interface CountryFieldProps {
  value: string;
  onSelect?: (destination: string) => void;
  /** Opens the full, alphabetical list of every country. */
  onOpen?: () => void;
  onBlur?: () => void;
  error?: string;
}

/**
 * Inline results stay short, so they fit above the keyboard; the full list
 * is one tap away.
 */
const MAX_SEARCH_RESULTS = 8;

/** A country's stamp: its scene, or the neutral art inside the same window. */
export function CountryStamp({ country }: { country: CountryOption }) {
  return country.art ? (
    <SceneStamp band="mini" image={DESTINATION_ART[country.art].sceneStampStill} shadow={false} />
  ) : (
    <SceneStamp band="mini" image={null} initial={country.code} shadow={false} />
  );
}

/**
 * Expandable country dropdown that suggests the illustrated destinations by
 * default and searches all 249 countries on demand, with the full list one
 * tap away. Its rows are part of the sheet's own scroll (no nested scroll),
 * and opening it or typing scrolls it into view above the keyboard.
 */
export function CountryField({ value, onSelect, onOpen, onBlur, error }: CountryFieldProps) {
  const { colors } = useTheme();
  const reveal = useSheetReveal();
  const rootRef = useRef<View>(null);
  const dropdownRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const country = countryForDestination(value) ?? findCountry(value);
  const destination = value.trim();
  const legacy = Boolean(destination && !countryForDestination(value));
  const isSearching = query.trim().length > 0;

  const matches = useMemo(() => (isSearching ? searchCountries(query) : []), [isSearching, query]);
  const displayedCountries = isSearching ? matches.slice(0, MAX_SEARCH_RESULTS) : ILLUSTRATED_COUNTRIES;
  const hiddenMatches = isSearching ? matches.length - displayedCountries.length : 0;

  // The keyboard shrinks the sheet after the search field takes focus: bring
  // the search field and its results back above it.
  useEffect(() => {
    if (!open || !searchFocused) return;
    const sub = Keyboard.addListener('keyboardDidShow', () => reveal(dropdownRef.current));
    return () => sub.remove();
  }, [open, searchFocused, reveal]);

  const handleToggle = () => {
    Keyboard.dismiss();
    haptic('selection');
    if (onSelect) {
      const next = !open;
      if (!next) {
        setQuery('');
        reveal(null);
      }
      setOpen(next);
    } else {
      onOpen?.();
    }
  };

  const handlePick = (nextDestination: string) => {
    Keyboard.dismiss();
    haptic('selection');
    onSelect?.(nextDestination);
    setOpen(false);
    setQuery('');
    onBlur?.();
    // The list collapses under the field: keep the new choice on screen.
    reveal(rootRef.current);
  };

  const browseAll = () => {
    if (!onOpen) return;
    Keyboard.dismiss();
    setOpen(false);
    setQuery('');
    reveal(null);
    onOpen();
  };

  const borderWidth = open || error ? 2 : 1.5;

  return (
    <View ref={rootRef} collapsable={false}>
      <View style={styles.labelRow}>
        <AppText role="kicker">COUNTRY</AppText>
        <AppText role="kicker" tone="muted" style={styles.optional}>optional</AppText>
      </View>
      <Pressable
        testID="country-picker-trigger"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Country: ${country?.name ?? (destination || 'not selected')}`}
        accessibilityHint="Open the country dropdown"
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.paper,
            borderColor: error ? colors.danger : open || pressed ? colors.ink : colors.fieldBorder,
            borderWidth,
            paddingHorizontal: spacing.s5,
          },
        ]}
      >
        {country ? (
          <View pointerEvents="none">
            <CountryStamp country={country} />
          </View>
        ) : (
          <View style={[styles.globeBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Globe size={iconSizes.md} color={colors.ink2} strokeWidth={iconStrokeWidth} />
          </View>
        )}
        <View style={styles.valueCol}>
          <AppText role="body" tone={destination ? 'primary' : 'muted'} numberOfLines={1}>
            {country?.name ?? (destination || 'Select a country')}
          </AppText>
          <AppText role="metaSm" tone="secondary" numberOfLines={1}>
            {country ? `Code ${country.code}` : 'Illustrated picks or search'}
          </AppText>
        </View>
        {open ? (
          <ChevronUp size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} />
        ) : (
          <ChevronDown size={iconSizes.md} color={colors.ink2} strokeWidth={iconStrokeWidth} />
        )}
      </Pressable>

      {open && onSelect ? (
        <View
          ref={dropdownRef}
          testID="country-dropdown-menu"
          // Opening shows the field with its list; while typing, the search
          // field and results come first.
          onLayout={() => reveal(searchFocused ? dropdownRef.current : rootRef.current)}
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.paper,
              borderColor: colors.ink,
              boxShadow: shadows.cardRaised,
            },
          ]}
        >
          <View style={[styles.searchRow, { backgroundColor: colors.bg, borderBottomColor: colors.hairline }]}>
            <Search size={iconSizes.sm} color={colors.ink2} strokeWidth={iconStrokeWidth} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search any country…"
              placeholderTextColor={colors.ink3}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
              style={[typeScale.bodySm, styles.searchInput, { color: colors.ink }]}
              accessibilityLabel="Search country"
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setQuery('')}
                style={({ pressed }) => [styles.clearSearch, pressed && styles.pressed]}
              >
                <X size={iconSizes.sm} color={colors.ink2} strokeWidth={iconStrokeWidth} />
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.sectionHeader, { borderBottomColor: colors.hairline }]}>
            <AppText role="monoXs" tone="secondary">
              {isSearching ? 'SEARCH RESULTS' : 'ILLUSTRATED DESTINATIONS'}
            </AppText>
          </View>

          {!isSearching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decide on a country later"
              accessibilityState={{ selected: !destination }}
              onPress={() => handlePick('')}
              style={({ pressed }) => [
                styles.dropdownRow,
                {
                  backgroundColor: !destination || pressed ? colors.bg : colors.paper,
                  borderBottomColor: colors.hairline,
                },
              ]}
            >
              <View style={styles.rowCopy}>
                <AppText role="body">Decide later</AppText>
                <AppText role="metaSm" tone="secondary">
                  You can add a country any time
                </AppText>
              </View>
              {!destination ? <Check size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} /> : null}
            </Pressable>
          ) : null}

          {displayedCountries.map((item) => {
            const isSelected = country?.code === item.code;
            return (
              <Pressable
                key={item.code}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handlePick(item.name)}
                style={({ pressed }) => [
                  styles.dropdownRow,
                  {
                    backgroundColor: isSelected || pressed ? colors.bg : colors.paper,
                    borderBottomColor: colors.hairline,
                  },
                ]}
              >
                <View pointerEvents="none">
                  <CountryStamp country={item} />
                </View>
                <View style={styles.rowCopy}>
                  <AppText role="body" numberOfLines={1}>
                    {item.name}
                  </AppText>
                </View>
                {isSelected ? <Check size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} /> : null}
              </Pressable>
            );
          })}

          {isSearching && displayedCountries.length === 0 ? (
            <View style={styles.emptyRow}>
              <AppText role="bodySm" tone="secondary">
                No matching countries. Try another name or 2-letter code.
              </AppText>
            </View>
          ) : null}
          {hiddenMatches > 0 ? (
            <View style={styles.emptyRow}>
              <AppText role="metaSm" tone="secondary">
                {`${hiddenMatches} more ${hiddenMatches === 1 ? 'match' : 'matches'}. Keep typing to narrow them down.`}
              </AppText>
            </View>
          ) : null}

          {onOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Browse all ${COUNTRIES.length} countries`}
              accessibilityHint="Opens the full list, A to Z"
              onPress={browseAll}
              style={({ pressed }) => [styles.browseRow, pressed && { backgroundColor: colors.bg }]}
            >
              <AppText role="link" style={styles.browseLabel}>
                {`Browse all ${COUNTRIES.length} countries`}
              </AppText>
              <ChevronRight size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <AppText role="bodySm" tone="danger" accessibilityRole="alert" style={styles.helper}>{error}</AppText>
      ) : legacy ? (
        <AppText role="bodySm" tone="secondary" style={styles.helper}>
          Saved destination. Select a country from the dropdown to replace it.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s2, marginBottom: spacing.s2 },
  optional: { textTransform: 'lowercase' },
  field: {
    minHeight: 62,
    paddingVertical: spacing.s3,
    borderRadius: radius.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
  },
  globeBadge: {
    width: STAMP_BANDS.mini.width,
    height: STAMP_BANDS.mini.height,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueCol: { flex: 1, minWidth: 0, gap: 2 },
  dropdown: {
    marginTop: spacing.s2,
    borderRadius: radius.input,
    borderWidth: 2,
    overflow: 'hidden',
  },
  searchRow: {
    minHeight: hitTargetMin,
    paddingLeft: spacing.s5,
    borderBottomWidth: hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.s3,
    // The clear button brings its own room on the right.
    marginRight: spacing.s5,
  },
  clearSearch: {
    width: hitTargetMin,
    height: hitTargetMin,
    marginLeft: -spacing.s5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s5,
    borderBottomWidth: hairlineWidth,
  },
  dropdownRow: {
    minHeight: hitTargetMin + spacing.s3,
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s5,
    borderBottomWidth: hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  browseRow: {
    minHeight: hitTargetMin,
    paddingHorizontal: spacing.s5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  browseLabel: { flex: 1 },
  emptyRow: {
    padding: spacing.s5,
    alignItems: 'center',
  },
  helper: { marginTop: spacing.s2 },
  pressed: { opacity: 0.7 },
});
