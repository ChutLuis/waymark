import { describe, expect, it } from 'vitest';
import {
  STACK_CARD_HEIGHT,
  WALLET,
  addressDates,
  envelopeNote,
  isDaysAway,
  miniRouteX,
  reconcileOrder,
  selectedLayout,
  stackHeight,
  walletScrollOffset,
  walletTop,
} from '../stack';

describe('wallet stack', () => {
  it('peeks each card 38 pt below the one above', () => {
    expect([0, 1, 2, 3].map(walletTop)).toEqual([0, 38, 76, 114]);
  });

  it('sizes the container to the cards', () => {
    expect(stackHeight(4)).toBe(454);
    expect(stackHeight(8)).toBe(606);
    expect(stackHeight(1)).toBe(340);
    expect(stackHeight(0)).toBe(0);
  });
});

describe('selectedLayout', () => {
  it('puts the selected card on top and the rest in a pile at the bottom', () => {
    const slots = selectedLayout(4, 2, 784);
    expect(slots[2]).toEqual({ top: 0, inset: 0 });
    const pile = [slots[0], slots[1], slots[3]];
    expect(pile.map((p) => p.top)).toEqual([704, 712, 720]);
    // The nearest card in the pile is the widest.
    expect(pile[2].inset).toBeLessThan(pile[0].inset);
  });

  it('never lets the pile cover the selected card', () => {
    const slots = selectedLayout(8, 0, 400);
    for (const slot of slots.slice(1)) expect(slot.top).toBeGreaterThanOrEqual(STACK_CARD_HEIGHT + WALLET.selectedMargin);
  });
});

describe('walletScrollOffset', () => {
  it('rests while the stack is in view', () => {
    expect(walletScrollOffset(2, 76, 0, 114)).toBe(0);
  });

  it('sticks scrolled cards at the top, each a few points under the last', () => {
    expect(walletScrollOffset(0, 0, 50, 114)).toBe(50);
    expect(walletScrollOffset(1, 38, 50, 114)).toBe(50 + WALLET.stickStep - 38);
    expect(walletScrollOffset(3, 114, 50, 114)).toBe(0);
  });

  it('stops sticking once the front card itself scrolls', () => {
    expect(walletScrollOffset(0, 0, 400, 114)).toBe(114);
  });

  it('fans the cards apart when pulled down', () => {
    expect(walletScrollOffset(0, 0, -100, 114)).toBe(0);
    expect(walletScrollOffset(3, 114, -100, 114)).toBeCloseTo(100 * 3 * WALLET.spread, 6);
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
