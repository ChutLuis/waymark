import { describe, expect, it } from 'vitest';
import {
  countdownLabel,
  cropTransform,
  CROPS,
  denomination,
  freeTimeLabel,
  matchDestination,
  otherMembersWording,
  romanMonth,
  tripDays,
  tripNights,
} from '../destinations';

describe('matchDestination', () => {
  it('matches whole words, not substrings', () => {
    expect(matchDestination('Kyoto, Japan')).toBe('japan');
    expect(matchDestination('Oaxaca')).toBe('mexico');
    expect(matchDestination('A weekend in Porto')).toBe('portugal');
  });

  it('normalises case, diacritics and whitespace', () => {
    expect(matchDestination('  PERÚ  ')).toBe('peru');
    expect(matchDestination('São Paulo is not in the list')).toBeNull();
    expect(matchDestination('CHIANG MAI')).toBe('thailand');
  });

  it('matches non-latin scripts', () => {
    expect(matchDestination('京都, 日本')).toBe('japan');
    expect(matchDestination('เชียงใหม่')).toBe('thailand');
  });

  it('takes the earliest country named when several match', () => {
    expect(matchDestination('Paris & Rome')).toBe('france');
    expect(matchDestination('Rome then Paris')).toBe('italy');
  });

  it('excludes Antigua and Barbuda from Guatemala', () => {
    expect(matchDestination('Antigua and Barbuda')).toBeNull();
    expect(matchDestination('Antigua, Guatemala')).toBe('guatemala');
  });

  it('excludes New Mexico from Mexico', () => {
    expect(matchDestination('New Mexico')).toBeNull();
    expect(matchDestination('Mexico City')).toBe('mexico');
  });

  it('returns null for empty or unknown text', () => {
    expect(matchDestination(null)).toBeNull();
    expect(matchDestination('')).toBeNull();
    expect(matchDestination('Somewhere cold')).toBeNull();
  });
});

describe('tripDays / tripNights', () => {
  it('counts days inclusively', () => {
    expect(tripDays('2026-03-28', '2026-04-06')).toBe(10);
    expect(tripDays('2026-11-13', '2026-11-23')).toBe(11);
  });

  it('single day is one day, zero nights', () => {
    expect(tripDays('2026-11-13', '2026-11-13')).toBe(1);
    expect(tripNights('2026-11-13', '2026-11-13')).toBe(0);
  });

  it('nights is days minus one', () => {
    expect(tripNights('2026-11-13', '2026-11-23')).toBe(10);
  });

  it('is zero when either date is missing or reversed', () => {
    expect(tripDays(null, '2026-11-23')).toBe(0);
    expect(tripDays('2026-11-23', null)).toBe(0);
    expect(tripDays('2026-11-23', '2026-11-13')).toBe(0);
  });
});

describe('denomination', () => {
  it('uses plural for many days', () => {
    expect(denomination('guatemala', 11)).toBe('11 DÍAS');
    expect(denomination('italy', 7)).toBe('7 GIORNI');
    expect(denomination('france', 5)).toBe('5 JOURS');
    expect(denomination('portugal', 8)).toBe('8 DIAS');
  });

  it('uses the singular form for one day', () => {
    expect(denomination('guatemala', 1)).toBe('1 DÍA');
    expect(denomination('italy', 1)).toBe('1 GIORNO');
    expect(denomination('france', 1)).toBe('1 JOUR');
  });

  it('does not pluralise Japanese or Thai', () => {
    expect(denomination('japan', 10)).toBe('10日');
    expect(denomination('thailand', 7)).toBe('7วัน');
    expect(denomination('thailand', 1)).toBe('1วัน');
  });

  it('uses Greek words', () => {
    expect(denomination('greece', 8)).toBe('8 ΗΜΕΡΕΣ');
    expect(denomination('greece', 1)).toBe('1 ΗΜΕΡΑ');
  });
});

describe('cropTransform', () => {
  it('covers a hero crop at 390x196', () => {
    const t = cropTransform(CROPS.hero, 390, 196);
    expect(t.scale).toBeCloseTo(Math.max(390 / 800, 196 / 400), 5);
    expect(t.left).toBeLessThanOrEqual(0);
    expect(t.top).toBeLessThanOrEqual(0);
  });

  it('anchors the banner to the top of the hero', () => {
    const hero = cropTransform(CROPS.hero, 390, 196);
    const banner = cropTransform(CROPS.banner, 390, 104);
    // Both render the art at about 0.49x at 390 pt wide.
    expect(banner.scale).toBeGreaterThanOrEqual(390 / 800);
    expect(banner.scale).toBeCloseTo(0.495, 2);
    expect(banner.top).toBe(0);
    expect(hero.top).toBeLessThanOrEqual(0);
    expect(hero.scale).toBeCloseTo(0.49, 2);
  });

  it('never exposes area outside the canvas', () => {
    const t = cropTransform(CROPS.stamp, 90, 99);
    expect(t.left).toBeLessThanOrEqual(0);
    expect(t.top).toBeLessThanOrEqual(0);
    expect(t.left + 800 * t.scale).toBeGreaterThanOrEqual(90);
    expect(t.top + 500 * t.scale).toBeGreaterThanOrEqual(99);
  });

  it('centres a crop that is wider than the window', () => {
    const t = cropTransform(CROPS.card, 352, 112);
    expect(t.scale).toBeCloseTo(352 / 800, 5);
  });
});

describe('freeTimeLabel', () => {
  it('uses minutes under an hour', () => {
    expect(freeTimeLabel(45)).toBe('45 min free');
  });
  it('uses hours and minutes', () => {
    expect(freeTimeLabel(90)).toBe('1 h 30 free');
  });
  it('drops minutes on the hour', () => {
    expect(freeTimeLabel(120)).toBe('2 h free');
  });
});

describe('countdownLabel', () => {
  it('uses minutes under an hour', () => {
    expect(countdownLabel(49)).toBe('IN 49 MIN');
  });
  it('uses hours at an hour or more', () => {
    expect(countdownLabel(120)).toBe('IN 2 H');
  });
});

describe('romanMonth', () => {
  it('maps months to Roman numerals', () => {
    expect(romanMonth(1)).toBe('I');
    expect(romanMonth(5)).toBe('V');
    expect(romanMonth(11)).toBe('XI');
    expect(romanMonth(12)).toBe('XII');
  });
});

describe('otherMembersWording', () => {
  const members = [
    { id: 'u1', displayName: 'Mia Junot' },
    { id: 'u2', displayName: 'Theo Park' },
  ];

  it('excludes the viewer, not the creator', () => {
    // Theo (u2) views a trip Mia created: sees "with Mia", not "with Theo".
    expect(otherMembersWording(members, 'u2')).toBe('with Mia');
    expect(otherMembersWording(members, 'u1')).toBe('with Theo');
  });

  it('is empty when the viewer is the only member', () => {
    expect(otherMembersWording([{ id: 'u1', displayName: 'Mia' }], 'u1')).toBe('');
  });

  it('joins three or more names', () => {
    const three = [
      { id: 'u1', displayName: 'Mia Junot' },
      { id: 'u2', displayName: 'Theo Park' },
      { id: 'u3', displayName: 'Ana Reyes' },
    ];
    expect(otherMembersWording(three, 'u1')).toBe('with Theo and Ana');
  });
});