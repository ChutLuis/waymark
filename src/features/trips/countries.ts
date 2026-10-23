/**
 * Offline country/territory choices. ISO 3166-1 codes and English names are
 * adapted from https://github.com/datasets/country-list (May 2026, PDDL), with
 * familiar travel names and search aliases instead of formal state titles.
 *
 * A selection writes its name to the existing `trip.destination` field. We
 * never rewrite a legacy free-text destination just because a form opens.
 * This module has no native or asset imports, so it is directly testable.
 */
import { normaliseDestination, type CountryKey } from './destinations';

const COUNTRY_NAMES = {
  AF: 'Afghanistan',
  AX: 'Åland Islands',
  AL: 'Albania',
  DZ: 'Algeria',
  AS: 'American Samoa',
  AD: 'Andorra',
  AO: 'Angola',
  AI: 'Anguilla',
  AQ: 'Antarctica',
  AG: 'Antigua and Barbuda',
  AR: 'Argentina',
  AM: 'Armenia',
  AW: 'Aruba',
  AU: 'Australia',
  AT: 'Austria',
  AZ: 'Azerbaijan',
  BS: 'Bahamas',
  BH: 'Bahrain',
  BD: 'Bangladesh',
  BB: 'Barbados',
  BY: 'Belarus',
  BE: 'Belgium',
  BZ: 'Belize',
  BJ: 'Benin',
  BM: 'Bermuda',
  BT: 'Bhutan',
  BO: 'Bolivia',
  BQ: 'Bonaire, Sint Eustatius and Saba',
  BA: 'Bosnia and Herzegovina',
  BW: 'Botswana',
  BV: 'Bouvet Island',
  BR: 'Brazil',
  IO: 'British Indian Ocean Territory',
  VG: 'British Virgin Islands',
  BN: 'Brunei',
  BG: 'Bulgaria',
  BF: 'Burkina Faso',
  BI: 'Burundi',
  CV: 'Cabo Verde',
  KH: 'Cambodia',
  CM: 'Cameroon',
  CA: 'Canada',
  KY: 'Cayman Islands',
  CF: 'Central African Republic',
  TD: 'Chad',
  CL: 'Chile',
  CN: 'China',
  CX: 'Christmas Island',
  CC: 'Cocos (Keeling) Islands',
  CO: 'Colombia',
  KM: 'Comoros',
  CK: 'Cook Islands',
  CR: 'Costa Rica',
  CI: 'Côte d’Ivoire',
  HR: 'Croatia',
  CU: 'Cuba',
  CW: 'Curaçao',
  CY: 'Cyprus',
  CZ: 'Czechia',
  CD: 'Democratic Republic of the Congo',
  DK: 'Denmark',
  DJ: 'Djibouti',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  EC: 'Ecuador',
  EG: 'Egypt',
  SV: 'El Salvador',
  GQ: 'Equatorial Guinea',
  ER: 'Eritrea',
  EE: 'Estonia',
  SZ: 'Eswatini',
  ET: 'Ethiopia',
  FK: 'Falkland Islands',
  FO: 'Faroe Islands',
  FJ: 'Fiji',
  FI: 'Finland',
  FR: 'France',
  GF: 'French Guiana',
  PF: 'French Polynesia',
  TF: 'French Southern Territories',
  GA: 'Gabon',
  GM: 'Gambia',
  GE: 'Georgia',
  DE: 'Germany',
  GH: 'Ghana',
  GI: 'Gibraltar',
  GR: 'Greece',
  GL: 'Greenland',
  GD: 'Grenada',
  GP: 'Guadeloupe',
  GU: 'Guam',
  GT: 'Guatemala',
  GG: 'Guernsey',
  GN: 'Guinea',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',
  HT: 'Haiti',
  HM: 'Heard Island and McDonald Islands',
  VA: 'Holy See (Vatican City)',
  HN: 'Honduras',
  HK: 'Hong Kong',
  HU: 'Hungary',
  IS: 'Iceland',
  IN: 'India',
  ID: 'Indonesia',
  IR: 'Iran',
  IQ: 'Iraq',
  IE: 'Ireland',
  IM: 'Isle of Man',
  IL: 'Israel',
  IT: 'Italy',
  JM: 'Jamaica',
  JP: 'Japan',
  JE: 'Jersey',
  JO: 'Jordan',
  KZ: 'Kazakhstan',
  KE: 'Kenya',
  KI: 'Kiribati',
  KW: 'Kuwait',
  KG: 'Kyrgyzstan',
  LA: 'Laos',
  LV: 'Latvia',
  LB: 'Lebanon',
  LS: 'Lesotho',
  LR: 'Liberia',
  LY: 'Libya',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MO: 'Macao',
  MG: 'Madagascar',
  MW: 'Malawi',
  MY: 'Malaysia',
  MV: 'Maldives',
  ML: 'Mali',
  MT: 'Malta',
  MH: 'Marshall Islands',
  MQ: 'Martinique',
  MR: 'Mauritania',
  MU: 'Mauritius',
  YT: 'Mayotte',
  MX: 'Mexico',
  FM: 'Micronesia',
  MD: 'Moldova',
  MC: 'Monaco',
  MN: 'Mongolia',
  ME: 'Montenegro',
  MS: 'Montserrat',
  MA: 'Morocco',
  MZ: 'Mozambique',
  MM: 'Myanmar',
  NA: 'Namibia',
  NR: 'Nauru',
  NP: 'Nepal',
  NL: 'Netherlands',
  NC: 'New Caledonia',
  NZ: 'New Zealand',
  NI: 'Nicaragua',
  NE: 'Niger',
  NG: 'Nigeria',
  NU: 'Niue',
  NF: 'Norfolk Island',
  KP: 'North Korea',
  MK: 'North Macedonia',
  MP: 'Northern Mariana Islands',
  NO: 'Norway',
  OM: 'Oman',
  PK: 'Pakistan',
  PW: 'Palau',
  PS: 'Palestine',
  PA: 'Panama',
  PG: 'Papua New Guinea',
  PY: 'Paraguay',
  PE: 'Peru',
  PH: 'Philippines',
  PN: 'Pitcairn',
  PL: 'Poland',
  PT: 'Portugal',
  PR: 'Puerto Rico',
  QA: 'Qatar',
  CG: 'Republic of the Congo',
  RE: 'Réunion',
  RO: 'Romania',
  RU: 'Russia',
  RW: 'Rwanda',
  BL: 'Saint Barthélemy',
  SH: 'Saint Helena, Ascension and Tristan da Cunha',
  KN: 'Saint Kitts and Nevis',
  LC: 'Saint Lucia',
  MF: 'Saint Martin (French part)',
  PM: 'Saint Pierre and Miquelon',
  VC: 'Saint Vincent and the Grenadines',
  WS: 'Samoa',
  SM: 'San Marino',
  ST: 'São Tomé and Príncipe',
  SA: 'Saudi Arabia',
  SN: 'Senegal',
  RS: 'Serbia',
  SC: 'Seychelles',
  SL: 'Sierra Leone',
  SG: 'Singapore',
  SX: 'Sint Maarten (Dutch part)',
  SK: 'Slovakia',
  SI: 'Slovenia',
  SB: 'Solomon Islands',
  SO: 'Somalia',
  ZA: 'South Africa',
  GS: 'South Georgia and the South Sandwich Islands',
  KR: 'South Korea',
  SS: 'South Sudan',
  ES: 'Spain',
  LK: 'Sri Lanka',
  SD: 'Sudan',
  SR: 'Suriname',
  SJ: 'Svalbard and Jan Mayen',
  SE: 'Sweden',
  CH: 'Switzerland',
  SY: 'Syria',
  TW: 'Taiwan',
  TJ: 'Tajikistan',
  TZ: 'Tanzania',
  TH: 'Thailand',
  TL: 'Timor-Leste',
  TG: 'Togo',
  TK: 'Tokelau',
  TO: 'Tonga',
  TT: 'Trinidad and Tobago',
  TN: 'Tunisia',
  TR: 'Türkiye',
  TM: 'Turkmenistan',
  TC: 'Turks and Caicos Islands',
  TV: 'Tuvalu',
  UG: 'Uganda',
  UA: 'Ukraine',
  AE: 'United Arab Emirates',
  GB: 'United Kingdom',
  US: 'United States',
  UM: 'United States Minor Outlying Islands',
  VI: 'U.S. Virgin Islands',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VU: 'Vanuatu',
  VE: 'Venezuela',
  VN: 'Vietnam',
  WF: 'Wallis and Futuna',
  EH: 'Western Sahara',
  YE: 'Yemen',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',
} as const;

export type CountryCode = keyof typeof COUNTRY_NAMES;

const ALIASES: Partial<Record<CountryCode, readonly string[]>> = {
  AE: ['UAE', 'U.A.E.'],
  BO: ['Bolivia (Plurinational State of)'],
  BN: ['Brunei Darussalam'],
  CD: ['DR Congo', 'DRC', 'Congo Kinshasa'],
  CG: ['Congo Brazzaville'],
  CI: ['Ivory Coast', "Cote d'Ivoire"],
  CV: ['Cape Verde'],
  CZ: ['Czech Republic'],
  DE: ['Deutschland'],
  ES: ['España', 'Espana'],
  FK: ['Malvinas'],
  FM: ['Federated States of Micronesia'],
  GB: ['UK', 'U.K.', 'Great Britain', 'Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
  GR: ['Hellas', 'Ellada', 'Ελλάδα'],
  IR: ['Iran (Islamic Republic of)'],
  IT: ['Italia'],
  JP: ['Nippon', 'Nihon', '日本'],
  KP: ["Democratic People's Republic of Korea", 'DPRK'],
  KR: ['Republic of Korea'],
  LA: ["Lao People's Democratic Republic", 'Lao PDR'],
  MA: ['Maroc'],
  MD: ['Republic of Moldova'],
  MM: ['Burma'],
  MO: ['Macau'],
  NL: ['Holland'],
  PS: ['State of Palestine'],
  RU: ['Russian Federation'],
  SZ: ['Swaziland'],
  SY: ['Syrian Arab Republic'],
  TL: ['East Timor'],
  TR: ['Turkey', 'Turkiye'],
  TW: ['Taiwan (Province of China)'],
  TZ: ['United Republic of Tanzania'],
  US: ['USA', 'U.S.A.', 'US of A', 'United States of America'],
  VA: ['Holy See', 'Vatican', 'Vatican City'],
  VE: ['Venezuela (Bolivarian Republic of)'],
  VG: ['Virgin Islands (British)', 'BVI'],
  VI: ['US Virgin Islands', 'Virgin Islands (U.S.)', 'USVI'],
  VN: ['Viet Nam'],
};

/** Only these countries have scenes. All other choices keep the neutral art. */
const COUNTRY_ART: Partial<Record<CountryCode, CountryKey>> = {
  JP: 'japan',
  GT: 'guatemala',
  MX: 'mexico',
  PE: 'peru',
  IT: 'italy',
  FR: 'france',
  GR: 'greece',
  PT: 'portugal',
  MA: 'morocco',
  TH: 'thailand',
};

export interface CountryOption {
  readonly code: CountryCode;
  readonly name: string;
  readonly art: CountryKey | null;
}

export const COUNTRIES: readonly CountryOption[] = (Object.keys(COUNTRY_NAMES) as CountryCode[])
  .map((code) => ({ code, name: COUNTRY_NAMES[code], art: COUNTRY_ART[code] ?? null }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

/** The countries with scene art, in the order the dropdown suggests them. */
export const ILLUSTRATED_CODES: readonly CountryCode[] = [
  'JP',
  'IT',
  'FR',
  'MX',
  'GR',
  'PT',
  'TH',
  'MA',
  'PE',
  'GT',
];

export const ILLUSTRATED_COUNTRIES: readonly CountryOption[] = ILLUSTRATED_CODES
  .map((code) => COUNTRIES.find((c) => c.code === code))
  .filter((c): c is CountryOption => Boolean(c));

export interface CountrySection {
  /** The index letter, without accents: Åland Islands files under A. */
  readonly title: string;
  readonly data: readonly CountryOption[];
}

/** Alphabetical countries grouped under their first letter, for browsing. */
export function countrySections(countries: readonly CountryOption[] = COUNTRIES): CountrySection[] {
  const sections: { title: string; data: CountryOption[] }[] = [];
  for (const country of countries) {
    const title = normaliseDestination(country.name).charAt(0).toUpperCase();
    const current = sections[sections.length - 1];
    if (current?.title === title) current.data.push(country);
    else sections.push({ title, data: [country] });
  }
  return sections;
}

function normaliseSearch(value: string): string {
  return normaliseDestination(value)
    .replace(/[.'’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const SEARCH_INDEX = COUNTRIES.map((country) => ({
  country,
  name: normaliseSearch(country.name),
  code: normaliseSearch(country.code),
  aliases: (ALIASES[country.code] ?? []).map(normaliseSearch),
}));

/** Saved codes, aliases and cities stay visibly legacy until explicitly replaced. */
export function countryForDestination(value: string | null | undefined): CountryOption | null {
  if (!value) return null;
  const query = normaliseSearch(value);
  return SEARCH_INDEX.find((entry) => entry.name === query)?.country ?? null;
}

/** Exact names/codes/aliases only: never guess a country from a city or substring. */
export function findCountry(value: string | null | undefined): CountryOption | null {
  if (!value) return null;
  const query = normaliseSearch(value);
  if (!query) return null;
  const exact = SEARCH_INDEX.find((entry) => entry.name === query || entry.code === query);
  if (exact) return exact.country;
  const aliased = SEARCH_INDEX.filter((entry) => entry.aliases.includes(query));
  return aliased.length === 1 ? aliased[0].country : null;
}

/** Search is optional; empty queries return every country, alphabetically. */
export function searchCountries(value: string): readonly CountryOption[] {
  const query = normaliseSearch(value);
  if (!query) return COUNTRIES;
  const words = query.split(/\s+/);
  return SEARCH_INDEX.flatMap((entry) => {
    const terms = [entry.name, entry.code, ...entry.aliases];
    if (!terms.some((term) => words.every((word) => term.includes(word)))) return [];
    const rank = terms.includes(query) ? 0 : terms.some((term) => term.startsWith(query)) ? 1 : 2;
    return [{ country: entry.country, rank }];
  })
    .sort((a, b) => a.rank - b.rank || a.country.name.localeCompare(b.country.name, 'en'))
    .map((entry) => entry.country);
}
