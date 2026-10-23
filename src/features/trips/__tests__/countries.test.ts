import { describe, expect, it } from 'vitest';
import {
  COUNTRIES,
  ILLUSTRATED_COUNTRIES,
  countryForDestination,
  countrySections,
  findCountry,
  searchCountries,
} from '../countries';
import { DESTINATION_INFO, matchDestination } from '../destinations';
import { tripSchema } from '@/lib/validation/schemas';

describe('country choices', () => {
  it('covers all 249 ISO countries and territories with unique names and codes', () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(new Set(COUNTRIES.map((country) => country.code)).size).toBe(249);
    expect(new Set(COUNTRIES.map((country) => country.name)).size).toBe(249);
    expect(COUNTRIES.every((country) => /^[A-Z]{2}$/.test(country.code))).toBe(true);
  });

  it('is alphabetised for browsing without typing', () => {
    const names = COUNTRIES.map((country) => country.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    expect(searchCountries('')).toBe(COUNTRIES);
    expect(searchCountries('   ')).toBe(COUNTRIES);
  });

  it('keeps countries without scenes selectable without borrowing another country’s art', () => {
    expect(findCountry('Canada')?.art).toBeNull();
    expect(findCountry('Antigua and Barbuda')?.art).toBeNull();
    for (const country of COUNTRIES) {
      expect(matchDestination(country.name), country.name).toBe(country.art);
    }
  });

  it('maps exactly the existing ten country scenes', () => {
    const withArt = COUNTRIES.filter((country) => country.art);
    expect(withArt).toHaveLength(Object.keys(DESTINATION_INFO).length);
    expect(withArt.map((country) => country.art).sort()).toEqual(Object.keys(DESTINATION_INFO).sort());
  });
});

describe('illustrated destinations', () => {
  it('suggests exactly the countries that have scene art, once each', () => {
    const withArt = COUNTRIES.filter((country) => country.art).map((country) => country.code);
    const suggested = ILLUSTRATED_COUNTRIES.map((country) => country.code);
    expect(new Set(suggested).size).toBe(suggested.length);
    expect([...suggested].sort()).toEqual([...withArt].sort());
    expect(ILLUSTRATED_COUNTRIES.every((country) => country.art !== null)).toBe(true);
  });
});

describe('countrySections', () => {
  const sections = countrySections();

  it('lists all 249 countries once, in alphabetical order', () => {
    const listed = sections.flatMap((section) => section.data);
    expect(listed).toEqual([...COUNTRIES]);
  });

  it('groups by unaccented first letter under unique, ordered A–Z titles', () => {
    const titles = sections.map((section) => section.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles).toEqual([...titles].sort());
    expect(titles.every((title) => /^[A-Z]$/.test(title))).toBe(true);
    for (const section of sections) {
      for (const country of section.data) {
        expect(country.name.normalize('NFD').charAt(0).toUpperCase(), country.name).toBe(section.title);
      }
    }
  });

  it('files accented and punctuated names under their letter', () => {
    const titleOf = (code: string) => sections.find((s) => s.data.some((c) => c.code === code))?.title;
    expect(titleOf('AX')).toBe('A'); // Åland Islands
    expect(titleOf('CI')).toBe('C'); // Côte d’Ivoire
    expect(titleOf('RE')).toBe('R'); // Réunion
    expect(titleOf('TR')).toBe('T'); // Türkiye
    expect(titleOf('VI')).toBe('U'); // U.S. Virgin Islands
  });

  it('groups any given alphabetical list', () => {
    const picked = ['Canada', 'Chile', 'Denmark'].map((name) => findCountry(name)!);
    expect(countrySections(picked)).toEqual([
      { title: 'C', data: picked.slice(0, 2) },
      { title: 'D', data: picked.slice(2) },
    ]);
    expect(countrySections([])).toEqual([]);
  });
});

describe('findCountry', () => {
  it.each(COUNTRIES)('round-trips $name by name and code', (country) => {
    expect(findCountry(country.name)).toBe(country);
    expect(findCountry(country.code)).toBe(country);
    expect(countryForDestination(country.name)).toBe(country);
    expect(countryForDestination(country.code)).toBeNull();
  });

  it('normalises names, accents, case and whitespace', () => {
    expect(findCountry('  méXICO  ')?.code).toBe('MX');
    expect(findCountry("Cote d'Ivoire")?.code).toBe('CI');
    expect(findCountry('curacao')?.code).toBe('CW');
  });

  it.each([
    ['U.S.A.', 'US'],
    ['UK', 'GB'],
    ['Great Britain', 'GB'],
    ['Turkey', 'TR'],
    ['Ivory Coast', 'CI'],
    ['Czech Republic', 'CZ'],
    ['日本', 'JP'],
    ['Republic of Korea', 'KR'],
  ])('recognises the exact alias %s', (alias, code) => {
    expect(findCountry(alias)?.code).toBe(code);
  });

  it('does not guess countries from cities, partial names or ambiguous regions', () => {
    for (const value of ['Kyoto', 'Paris, France', 'New Mexico', 'Congo', 'Korea', 'Port']) {
      expect(findCountry(value)).toBeNull();
    }
  });

  it('has no default country for empty or unknown destinations', () => {
    for (const value of [null, undefined, '', '   ', 'Narnia']) {
      expect(findCountry(value)).toBeNull();
    }
  });
});

describe('countryForDestination', () => {
  it('recognises persisted full names without depending on case, accents or apostrophes', () => {
    expect(countryForDestination('  méXICO  ')?.code).toBe('MX');
    expect(countryForDestination("Cote d'Ivoire")?.code).toBe('CI');
    expect(countryForDestination('japan')?.art).toBe('japan');
  });

  it('does not visually rewrite legacy codes, aliases or cities before a selection', () => {
    for (const value of ['JP', 'Nippon', '日本', 'UK', 'Great Britain', 'Kyoto, Japan', null, '', '   ']) {
      expect(countryForDestination(value)).toBeNull();
    }
  });
});

describe('searchCountries', () => {
  it('filters partial, multi-word and accent-free names', () => {
    expect(searchCountries('guate').map((country) => country.code)).toEqual(['GT']);
    expect(searchCountries('cote ivoire').map((country) => country.code)).toEqual(['CI']);
    expect(searchCountries('sao tome').map((country) => country.code)).toEqual(['ST']);
  });

  it('ranks an exact name, alias or code before substring matches', () => {
    expect(searchCountries('IN')[0].code).toBe('IN');
    expect(searchCountries('U.S.A.')[0].code).toBe('US');
    expect(searchCountries('Guinea')[0].code).toBe('GN');
    expect(searchCountries('Dominica')[0].code).toBe('DM');
  });

  it('distinguishes similarly named countries instead of selecting one automatically', () => {
    expect(searchCountries('Congo').map((country) => country.code).sort()).toEqual(['CD', 'CG']);
    expect(searchCountries('Korea').map((country) => country.code).sort()).toEqual(['KP', 'KR']);
  });

  it('returns an empty list for unmatched text instead of guessing from a city', () => {
    expect(searchCountries('zzzz')).toEqual([]);
    expect(searchCountries('Kyoto')).toEqual([]);
  });
});

describe('trip destination compatibility', () => {
  const form = { name: 'Autumn trip', startDate: null, endDate: null };

  it('allows leaving the country undecided', () => {
    expect(tripSchema.parse({ ...form, destination: '' }).destination).toBe('');
  });

  it('accepts every canonical country selection in the existing destination field', () => {
    for (const country of COUNTRIES) {
      expect(tripSchema.parse({ ...form, destination: country.name }).destination).toBe(country.name);
    }
  });

  it('preserves legacy free-text destinations during unrelated edits', () => {
    const destination = 'Antigua & Tikal, Guatemala';
    expect(tripSchema.parse({ ...form, destination }).destination).toBe(destination);
  });
});
