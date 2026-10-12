import { describe, expect, it } from 'vitest';
import {
  STACK_CARD_HEIGHT,
  WALLET,
  addressDates,
  envelopeNote,
  isDaysAway,
  miniRouteX,
  reconcileOrder,
  riseDelay,
  walletHeight,
  walletTop,
} from '../stack';

describe('raised stack', () => {
  it('peeks each card above the next', () => {
    expect([0, 1, 2].map(walletTop)).toEqual([WALLET.topPad, WALLET.topPad + 60, WALLET.topPad + 120]);
  });

  it('shows the front card in full at the bottom', () => {
    expect(walletHeight(4)).toBe(walletTop(3) + STACK_CARD_HEIGHT);
    expect(walletHeight(0)).toBe(0);
  });

  it('raises the front card first and the top card last', () => {
    expect([0, 1, 2, 3].map((i) => riseDelay(i, 4, 30))).toEqual([90, 60, 30, 0]);
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
