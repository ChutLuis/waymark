import { describe, expect, it } from 'vitest';
import {
  RAIL,
  addressDates,
  envelopeNote,
  isDaysAway,
  miniRouteX,
  railCaption,
  railEntries,
  railScrollTarget,
  reconcileOrder,
} from '../stack';

describe('railCaption', () => {
  it('says NOW, the start date, or NO DATE', () => {
    expect(railCaption({ id: 'k', startDate: '2026-10-03' }, true)).toBe('NOW');
    expect(railCaption({ id: 'b', startDate: '2026-10-13' }, false)).toBe('13 OCT');
    expect(railCaption({ id: 'w', startDate: null }, false)).toBe('NO DATE');
  });
});

describe('railEntries', () => {
  const trips = [
    { id: 'kyoto', startDate: '2026-10-03' },
    { id: 'berlin', startDate: '2026-10-13' },
    { id: 'tikal', startDate: '2027-01-08' },
    { id: 'oia', startDate: '2027-05-02' },
    { id: 'warm', startDate: null },
    { id: 'pass', startDate: null },
  ];
  const entries = railEntries(trips, new Set(['kyoto']));

  it('keeps the default order', () => {
    expect(entries.filter((e) => e.kind === 'trip').map((e) => (e as { id: string }).id)).toEqual([
      'kyoto', 'berlin', 'tikal', 'oia', 'warm', 'pass',
    ]);
  });

  it('puts a year divider where the year changes and a blank one before the undated', () => {
    expect(entries.map((e) => (e.kind === 'trip' ? e.id : `|${e.label ?? ''}`))).toEqual([
      'kyoto', 'berlin', '|2027', 'tikal', 'oia', '|', 'warm', 'pass',
    ]);
  });

  it('lays the entries out 10 apart from the 24 pt padding', () => {
    expect(entries.map((e) => e.x)).toEqual([24, 82, 140, 178, 236, 294, 332, 390]);
  });

  it('adds no divider for a single year or before an all-undated rail', () => {
    expect(railEntries([{ id: 'a', startDate: null }, { id: 'b', startDate: null }], new Set()).every((e) => e.kind === 'trip')).toBe(true);
    expect(railEntries([{ id: 'a', startDate: '2026-01-01' }, { id: 'b', startDate: '2026-12-01' }], new Set()).length).toBe(2);
  });
});

describe('railScrollTarget', () => {
  it('leaves a stamp in full view alone', () => {
    expect(railScrollTarget(82, 0, 390, 900)).toBeNull();
  });

  it('scrolls a cut-off stamp in with 24 pt to spare', () => {
    expect(railScrollTarget(390, 0, 390, 900)).toBe(390 + RAIL.stampWidth + RAIL.spare - 390);
    expect(railScrollTarget(24, 200, 390, 900)).toBe(0);
  });

  it('never scrolls past the content', () => {
    expect(railScrollTarget(840, 0, 390, 900)).toBe(510);
  });
});

describe('reconcileOrder', () => {
  it('drops missing trips and appends new ones', () => {
    expect(reconcileOrder(['b', 'a', 'c'], ['a', 'b', 'd'])).toEqual(['b', 'a', 'd']);
  });
});

describe('addressDates', () => {
  it('writes one month once', () => {
    expect(addressDates('2026-10-13', '2026-10-15')).toBe('13 – 15 October');
  });
  it('writes both months across a boundary', () => {
    expect(addressDates('2026-03-28', '2026-04-06')).toBe('28 March – 6 April');
  });
  it('is empty without dates', () => {
    expect(addressDates(null, '2026-04-06')).toBe('');
  });
});

describe('envelopeNote', () => {
  it('names the travel companions and the length', () => {
    expect(envelopeNote({ hasDates: true, others: ['Theo Park'], days: 6 })).toBe('with Theo, six days');
  });
  it('counts nights for a solo trip', () => {
    expect(envelopeNote({ hasDates: true, others: [], days: 3 })).toBe('two nights');
  });
  it('asks for dates without them', () => {
    expect(envelopeNote({ hasDates: false, others: [], days: 0 })).toBe('pick dates to get a stamp');
  });
});

describe('isDaysAway', () => {
  it('is true within a week', () => {
    expect(isDaysAway('2026-10-17', '2026-10-12')).toBe(true);
    expect(isDaysAway('2026-11-02', '2026-10-12')).toBe(false);
    expect(isDaysAway(null, '2026-10-12')).toBe(false);
  });
});

describe('miniRouteX', () => {
  it('places times proportionally from first to last stop', () => {
    expect(miniRouteX(13 * 60, 8 * 60, 21 * 60, 310)).toBeCloseTo((5 / 13) * 310, 6);
    expect(miniRouteX(7 * 60, 8 * 60, 21 * 60, 310)).toBe(0);
    expect(miniRouteX(22 * 60, 8 * 60, 21 * 60, 310)).toBe(310);
  });
});
