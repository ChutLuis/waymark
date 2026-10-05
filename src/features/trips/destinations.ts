/**
 * Destination system. Derives everything from the existing free-text
 * `trip.destination`, so there are no schema changes.
 *
 * This module is pure (no asset imports) so it can be unit-tested directly.
 * The Metro static `require`s for each destination's art live in
 * `destinationArt.ts`, keyed by the same `CountryKey`.
 *
 * See `design_handoff_airmail_v3/README.md` (Destination system) for the table.
 */

export type CountryKey =
  | 'japan'
  | 'guatemala'
  | 'mexico'
  | 'peru'
  | 'italy'
  | 'france'
  | 'greece'
  | 'portugal'
  | 'morocco'
  | 'thailand';

export type SceneCrop = 'hero' | 'banner' | 'header' | 'card' | 'stamp';

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Crop rectangles on the 800x500 scene canvas. */
export const CROPS: Record<SceneCrop, CropRect> = {
  hero: { x: 0, y: 0, w: 800, h: 400 },
  banner: { x: 0, y: 0, w: 800, h: 210 },
  header: { x: 0, y: 50, w: 800, h: 400 },
  card: { x: 0, y: 70, w: 800, h: 300 },
  stamp: { x: 200, y: 0, w: 400, h: 500 },
};

export const SCENE_WIDTH = 800;
export const SCENE_HEIGHT = 500;

export interface DestinationInfo {
  key: CountryKey;
  /** Region display name for the trip settings card, e.g. "Japan". */
  region: string;
  /** Name printed on the stamp, e.g. NIPPON. */
  stampName: string;
  /** Denomination words, e.g. ["DÍAS","DÍA"] (plural, singular). */
  denomination: [string, string];
  /** Scene art caption / header chip, e.g. Kyoto. */
  caption: string;
  /** Stamp description, e.g. "torii and sakura". */
  description: string;
  /** Postcard header chip (with local script), e.g. "京都 · KYOTO". */
  chip: string;
  /** Pattern band key; 'airmail' is the not-designed fallback. */
  pattern: 'japan' | 'guatemala' | 'portugal' | 'airmail';
  /** Status-bar content colour over the scene. */
  statusBar: 'dark' | 'light';
}

export const DESTINATION_INFO: Record<CountryKey, DestinationInfo> = {
  japan: {
    key: 'japan',
    region: 'Japan',
    stampName: 'NIPPON',
    denomination: ['日', '日'],
    caption: 'Kyoto',
    description: 'torii and sakura',
    chip: '京都 · KYOTO',
    pattern: 'japan',
    statusBar: 'dark',
  },
  guatemala: {
    key: 'guatemala',
    region: 'Guatemala',
    stampName: 'GUATEMALA',
    denomination: ['DÍAS', 'DÍA'],
    caption: 'Tikal',
    description: "Tikal's temples over the canopy",
    chip: 'TIKAL',
    pattern: 'guatemala',
    statusBar: 'dark',
  },
  mexico: {
    key: 'mexico',
    region: 'Mexico',
    stampName: 'MÉXICO',
    denomination: ['DÍAS', 'DÍA'],
    caption: 'Oaxaca',
    description: 'papel picado and Santo Domingo',
    chip: 'OAXACA',
    pattern: 'airmail',
    statusBar: 'dark',
  },
  peru: {
    key: 'peru',
    region: 'Peru',
    stampName: 'PERÚ',
    denomination: ['DÍAS', 'DÍA'],
    caption: 'Machu Picchu',
    description: 'the citadel under Huayna Picchu',
    chip: 'MACHU PICCHU',
    pattern: 'airmail',
    statusBar: 'dark',
  },
  italy: {
    key: 'italy',
    region: 'Italy',
    stampName: 'ITALIA',
    denomination: ['GIORNI', 'GIORNO'],
    caption: 'Positano',
    description: 'Positano from a lemon pergola',
    chip: 'POSITANO',
    pattern: 'airmail',
    statusBar: 'dark',
  },
  france: {
    key: 'france',
    region: 'France',
    stampName: 'FRANCE',
    denomination: ['JOURS', 'JOUR'],
    caption: 'Paris',
    description: 'the Seine at dusk',
    chip: 'PARIS',
    pattern: 'airmail',
    statusBar: 'dark',
  },
  greece: {
    key: 'greece',
    region: 'Greece',
    stampName: 'HELLAS',
    denomination: ['ΗΜΕΡΕΣ', 'ΗΜΕΡΑ'],
    caption: 'Oia',
    description: 'blue domes over the caldera',
    chip: 'ΟΙΑ · OIA',
    pattern: 'airmail',
    statusBar: 'dark',
  },
  portugal: {
    key: 'portugal',
    region: 'Portugal',
    stampName: 'PORTUGAL',
    denomination: ['DIAS', 'DIA'],
    caption: 'Lisboa',
    description: 'Tram 28 under the washing lines',
    chip: 'LISBOA',
    pattern: 'portugal',
    statusBar: 'dark',
  },
  morocco: {
    key: 'morocco',
    region: 'Morocco',
    stampName: 'MAROC',
    denomination: ['JOURS', 'JOUR'],
    caption: 'Marrakech',
    description: 'Majorelle blue, Koutoubia beyond',
    chip: 'MARRAKECH',
    pattern: 'airmail',
    statusBar: 'dark',
  },
  thailand: {
    key: 'thailand',
    region: 'Thailand',
    stampName: 'THAILAND',
    denomination: ['วัน', 'วัน'],
    caption: 'Chiang Mai',
    description: 'lanterns over a Lanna temple',
    chip: 'เชียงใหม่ · CHIANG MAI',
    pattern: 'airmail',
    statusBar: 'light',
  },
};

/**
 * Match terms per country, in whole words. Matching order follows this object,
 * but the earliest term *in the text* wins (README).
 */
const MATCH_TERMS: Record<CountryKey, string[]> = {
  japan: [
    'japan', 'nippon', 'nihon', '日本', 'kyoto', 'tokyo', 'osaka', 'nara', 'hiroshima', 'sapporo',
    'hokkaido', 'okinawa', 'fukuoka', 'kanazawa', 'hakone', 'nikko',
  ],
  guatemala: ['guatemala', 'tikal', 'antigua', 'flores', 'atitlan', 'xela', 'quetzaltenango'],
  mexico: [
    'mexico', 'oaxaca', 'cdmx', 'mexico city', 'yucatan', 'merida', 'cancun', 'tulum', 'puebla',
    'guadalajara', 'san miguel de allende', 'chiapas', 'guanajuato',
  ],
  peru: ['peru', 'machu picchu', 'cusco', 'cuzco', 'lima', 'arequipa', 'sacred valley'],
  italy: [
    'italy', 'italia', 'positano', 'amalfi', 'rome', 'roma', 'florence', 'firenze', 'venice',
    'venezia', 'milan', 'milano', 'naples', 'napoli', 'sicily', 'sicilia', 'tuscany', 'toscana',
    'capri', 'sorrento', 'cinque terre', 'bologna', 'puglia', 'como',
  ],
  france: [
    'france', 'paris', 'lyon', 'nice', 'marseille', 'bordeaux', 'provence', 'normandy',
    'normandie', 'strasbourg', 'loire',
  ],
  greece: [
    'greece', 'hellas', 'ellada', 'ελλάδα', 'santorini', 'oia', 'athens', 'mykonos', 'crete',
    'naxos', 'paros', 'rhodes', 'corfu', 'thessaloniki', 'meteora',
  ],
  portugal: [
    'portugal', 'lisbon', 'lisboa', 'porto', 'sintra', 'algarve', 'madeira', 'azores', 'acores',
    'coimbra', 'evora',
  ],
  morocco: [
    'morocco', 'maroc', 'marrakech', 'marrakesh', 'fes', 'fez', 'chefchaouen', 'casablanca',
    'rabat', 'essaouira', 'tangier',
  ],
  thailand: [
    'thailand', 'chiang mai', 'bangkok', 'phuket', 'krabi', 'chiang rai', 'koh samui',
    'ko samui', 'pai', 'ayutthaya', 'เชียงใหม่',
  ],
};

/** Strip latin diacritics; CJK/Thai/Greek letters pass through unchanged. */
export function normaliseDestination(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word (or CJK/Thai substring) term start index, or -1. */
function termIndex(haystack: string, term: string): number {
  const t = normaliseDestination(term);
  const isCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0e00-\u0e7f]/.test(t);
  if (isCjk) return haystack.indexOf(t);
  const re = new RegExp(`(?:^|[^a-z0-9])(${escapeRegExp(t)})(?:$|[^a-z0-9])`, 'i');
  const m = re.exec(haystack);
  if (!m) return -1;
  return m.index + m[0].indexOf(m[1]);
}

/**
 * Normalise, strip diacritics and trim, then match whole words. If several
 * countries match, the earliest term in the string wins. `antigua … barbuda`
 * is not Guatemala, and `new mexico` is not Mexico.
 */
export function matchDestination(text: string | null): CountryKey | null {
  if (!text) return null;
  let hay = normaliseDestination(text);
  if (!hay) return null;

  // Exclusions: `antigua … barbuda` is not Guatemala. Drop the "antigua" word
  // when it is the Antigua-and-Barbuda pair so it can't match Guatemala.
  hay = hay.replace(/antigua\s+(?:and|&|y)?\s*barbuda/g, 'barbuda');

  let best: { key: CountryKey; index: number } | null = null;
  for (const key of Object.keys(MATCH_TERMS) as CountryKey[]) {
    for (const term of MATCH_TERMS[key]) {
      const idx = termIndex(hay, term);
      if (idx < 0) continue;
      // `new mexico` is not Mexico.
      if (key === 'mexico' && normaliseDestination(term) === 'mexico') {
        if (/\bnew\s$/.test(hay.slice(Math.max(0, idx - 4), idx))) continue;
      }
      if (!best || idx < best.index) best = { key, index: idx };
    }
  }
  return best?.key ?? null;
}

/** Inclusive day count: 28 Mar – 6 Apr = 10; 13–23 Nov = 11. */
export function tripDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = Date.parse(`${start}T00:00:00Z`);
  const e = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  const days = Math.round((e - s) / 86_400_000) + 1;
  return days > 0 ? days : 0;
}

/** Inclusive days minus one. */
export function tripNights(start: string | null, end: string | null): number {
  const days = tripDays(start, end);
  return days > 0 ? days - 1 : 0;
}

/**
 * "10日", "11 DÍAS", "1 DÍA". Uses the singular form when days = 1. Japanese
 * and Thai count nouns don't pluralise, so both forms are the same word.
 */
export function denomination(key: CountryKey, days: number): string {
  const [plural, singular] = DESTINATION_INFO[key].denomination;
  const word = days === 1 ? singular : plural;
  if (key === 'japan' || key === 'thailand') return `${days}${word}`;
  return `${days} ${word}`;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** Roman numeral for a 1-based month: 1 → I, 11 → XI. */
export function romanMonth(month: number): string {
  return ROMAN[month] ?? '';
}

/**
 * Fit a crop of the 800x500 canvas into a WxH window: cover the crop, centre on
 * it, never show outside the canvas. Returns the scale and the absolute offset.
 */
export function cropTransform(
  crop: CropRect,
  W: number,
  H: number,
): { scale: number; left: number; top: number } {
  const scale = Math.max(W / crop.w, H / crop.h);
  const rawLeft = W / 2 - (crop.x + crop.w / 2) * scale;
  const rawTop = H / 2 - (crop.y + crop.h / 2) * scale;
  const minLeft = W - SCENE_WIDTH * scale;
  const minTop = H - SCENE_HEIGHT * scale;
  const left = Math.min(0, Math.max(minLeft, rawLeft));
  const top = Math.min(0, Math.max(minTop, rawTop));
  return { scale, left, top };
}

/** "45 min free", "1 h 30 free", "2 h free". */
export function freeTimeLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min free`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h free` : `${h} h ${m} free`;
}

/** "IN 49 MIN" under an hour, otherwise "IN 7 H". */
export function countdownLabel(minutesUntil: number): string {
  if (minutesUntil < 60) return `IN ${Math.max(0, Math.round(minutesUntil))} MIN`;
  return `IN ${Math.round(minutesUntil / 60)} H`;
}

/* ------------------------------------------------------------------ */
/* Trip copy (README: 06 · Plan title row, 04 · Trips list)            */
/* ------------------------------------------------------------------ */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDateOnly(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * "28 Mar – 6 Apr" (spaced en dash across months), "13–23 Nov" (same month).
 * Empty when either date is missing.
 */
export function formatTripRange(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  const sm = MONTHS_SHORT[s.getMonth()];
  const em = MONTHS_SHORT[e.getMonth()];
  return sm === em
    ? `${s.getDate()}–${e.getDate()} ${em}`
    : `${s.getDate()} ${sm} – ${e.getDate()} ${em}`;
}

/**
 * "with Theo", "with Theo and Ana", "with Theo, Ana and Jo". Lists the other
 * members' first names; empty when there are none.
 */
export function memberNamesWording(names: string[]): string {
  const firsts = names.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
  if (firsts.length === 0) return '';
  if (firsts.length === 1) return `with ${firsts[0]}`;
  if (firsts.length === 2) return `with ${firsts[0]} and ${firsts[1]}`;
  return `with ${firsts.slice(0, -1).join(', ')} and ${firsts[firsts.length - 1]}`;
}

/** Morning 05:00–11:59, afternoon 12:00–17:59, evening otherwise. */
export function greetingFor(now: Date, firstName: string): string {
  const h = now.getHours();
  const part = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${firstName}.`;
}

/** "IN 7 MONTHS", "IN 26 DAYS", "TODAY", or null when there's no date. */
export function daysUntilLabelUppercase(startDate: string | null, todayKey: string): string | null {
  if (!startDate) return null;
  const toUtc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const diff = Math.round((toUtc(startDate) - toUtc(todayKey)) / 86_400_000);
  if (diff <= 0) return 'TODAY';
  if (diff < 31) return `IN ${diff} ${diff === 1 ? 'DAY' : 'DAYS'}`;
  const months = Math.round(diff / 30);
  return `IN ${months} ${months === 1 ? 'MONTH' : 'MONTHS'}`;
}

/** "28 MAR – 6 APR · 10 DAYS" for the trip settings card. */
export function tripDatesKicker(start: string | null, end: string | null): string {
  const range = formatTripRange(start, end);
  if (!range) return 'NO DATES YET';
  const days = tripDays(start, end);
  return `${range.toUpperCase()} · ${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
}