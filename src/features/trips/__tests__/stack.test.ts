import { describe, expect, it } from 'vitest';
import {
  addressDates,
  backToFront,
  bringToFront,
  envelopeNote,
  isDaysAway,
  miniRouteX,
  passToBack,
  reconcileOrder,
  stackHeight,
  stackPosition,
} from '../stack';

describe('stackPosition', () => {
  it('matches the design table for four cards', () => {
    expect([0, 1, 2, 3].map((d) => stackPosition(d, 4))).toEqual([
      { top: 114, inset: 0, z: 100, hidden: false },
      { top: 76, inset: 5, z: 99, hidden: false },
      { top: 38, inset: 11, z: 98, hidden: false },
      { top: 0, inset: 18, z: 97, hidden: false },
    ]);
  });

  it('parks cards past the fourth behind the last visible one', () => {
    const fifth = stackPosition(4, 8);
    expect(fifth).toMatchObject({ top: 0, inset: 18, hidden: true });
    expect(fifth.z).toBeLessThan(stackPosition(3, 8).z);
    expect(stackPosition(0, 8).top).toBe(114);
  });

  it('keeps the deepest card at the top of a smaller stack', () => {
    expect(stackPosition(0, 2).top).toBe(38);
    expect(stackPosition(1, 2).top).toBe(0);
    expect(stackPosition(0, 1).top).toBe(0);
  });

  it('sizes the container to the cards', () => {
    expect(stackHeight(4)).toBe(454);
    expect(stackHeight(9)).toBe(454);
    expect(stackHeight(1)).toBe(340);
    expect(stackHeight(0)).toBe(0);
  });
});

describe('bringToFront', () => {
  it('moves the tapped card to depth 0 and keeps the rest in order', () => {
    expect(bringToFront(['kyoto', 'chiang', 'berlin', 'invite'], 'berlin')).toEqual([
      'berlin', 'kyoto', 'chiang', 'invite',
    ]);
  });

  it('is a no-op for the front card or an unknown id', () => {
    const order = ['a', 'b'];
    expect(bringToFront(order, 'a')).toBe(order);
    expect(bringToFront(order, 'z')).toBe(order);
  });
});

describe('passToBack / backToFront', () => {
  it('cycles the stack both ways', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    expect(passToBack(order)).toEqual(['b', 'c', 'd', 'e', 'a']);
    expect(backToFront(order)).toEqual(['e', 'a', 'b', 'c', 'd']);
    expect(backToFront(passToBack(order))).toEqual(order);
  });

  it('leaves a single card alone', () => {
    expect(passToBack(['a'])).toEqual(['a']);
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
