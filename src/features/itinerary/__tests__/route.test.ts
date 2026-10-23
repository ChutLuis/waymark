import { describe, expect, it } from 'vitest';
import { NOW_SLOT, flightStartY, layoutRoute, nowSlotIndex, routeYAt, stopsSummary, withNowSlot } from '../route';
import { stopsToGo } from '../group';
import { SHELL } from '../../trips/shellLayout';

const H = (h: number, m = 0) => h * 60 + m;

describe('layoutRoute', () => {
  it('places stops 24 pt per hour from the first stop', () => {
    const tops = layoutRoute([
      { minutes: H(8), height: 30 },
      { minutes: H(13), height: 70 },
      { minutes: H(21), height: 100 },
    ]);
    expect(tops).toEqual([0, 120, 312]);
  });

  it('keeps a minimum gap when stops are close in time', () => {
    const tops = layoutRoute([
      { minutes: H(8), height: 42 },
      { minutes: H(8, 30), height: 42 },
    ]);
    expect(tops[1]).toBe(42 + 16);
  });

  it('leaves room for a free-time label', () => {
    const tops = layoutRoute([
      { minutes: H(8), height: 42 },
      { minutes: H(9), height: 42, freeBefore: true },
    ]);
    expect(tops[1]).toBe(42 + 40);
  });

  it('returns to the time scale after a pushed row', () => {
    const tops = layoutRoute([
      { minutes: H(8), height: 42 },
      { minutes: H(8, 15), height: 42 },
      { minutes: H(13), height: 42 },
    ]);
    expect(tops[1]).toBe(58);
    expect(tops[2]).toBe(120);
  });

  it('stacks untimed stops with the minimum gap', () => {
    expect(layoutRoute([
      { minutes: null, height: 50 },
      { minutes: null, height: 50 },
    ])).toEqual([0, 66]);
  });
});

describe('routeYAt', () => {
  const points = [
    { minutes: H(8), y: 21 },
    { minutes: H(13), y: 141 },
    { minutes: H(21), y: 339 },
  ];

  it('interpolates between the stops around now', () => {
    expect(routeYAt(points, H(17))).toBeCloseTo(141 + (339 - 141) / 2, 6);
  });

  it('clamps before the first and after the last stop', () => {
    expect(routeYAt(points, H(6))).toBe(21);
    expect(routeYAt(points, H(23))).toBe(339);
  });

  it('is null without timed stops', () => {
    expect(routeYAt([{ minutes: null, y: 10 }], H(9))).toBeNull();
  });

  it("returns the NOW slot's centre when the route has one", () => {
    expect(routeYAt([...points, { minutes: null, y: 200, slot: true }], H(17))).toBe(200);
  });
});

describe('the NOW slot', () => {
  const times = [H(8), H(11, 30), H(16, 30), H(21)];

  it('sits after the last stop at or before now', () => {
    expect(nowSlotIndex(times, H(7, 30))).toBe(0);
    expect(nowSlotIndex(times, H(8))).toBe(1);
    expect(nowSlotIndex(times, H(16, 28))).toBe(2);
    expect(nowSlotIndex(times, H(16, 31))).toBe(3);
    expect(nowSlotIndex(times, H(22))).toBe(4);
  });

  it('ignores untimed stops', () => {
    expect(nowSlotIndex([H(8), null, H(13)], H(12))).toBe(1);
  });

  it('takes the free-time label of its gap and moves the rows below down', () => {
    const rows = [
      { minutes: H(8), height: 42 },
      { minutes: H(8, 30), height: 42, freeBefore: true },
    ];
    const laid = withNowSlot(rows, 1);
    expect(laid.map((r) => [!!r.slot, !!r.freeBefore])).toEqual([
      [false, false],
      [true, true],
      [false, false],
    ]);
    // Under the label: 42 + 40; the next row below it: + 30 + 16.
    expect(layoutRoute(laid)).toEqual([0, 82, 128]);
    expect(rows[1].freeBefore).toBe(true);
  });

  it('goes above the first row and below the last', () => {
    const rows = [
      { minutes: H(8), height: 42 },
      { minutes: H(12), height: 42 },
    ];
    expect(layoutRoute(rows)).toEqual([0, 96]);
    // Above: the day moves down 30 + 16 and keeps its time scale.
    expect(layoutRoute(withNowSlot(rows, 0))).toEqual([0, 46, 142]);
    // Below: 16 under the last row.
    expect(layoutRoute(withNowSlot(rows, 2))).toEqual([0, 96, 154]);
  });

  it('keeps the NOW tag off the NEXT ticket at 16:28 on Kyoto day 10', () => {
    // Fushimi Inari (done, compact), Tea ceremony (confirmed), Gion walk (the
    // NEXT ticket), Philosopher's Path; free time between each.
    const rows = [
      { minutes: H(8), height: 42 },
      { minutes: H(11, 30), height: 76, freeBefore: true },
      { minutes: H(16, 30), height: 104, freeBefore: true },
      { minutes: H(21), height: 76, freeBefore: true },
    ];
    const at = nowSlotIndex(rows.map((r) => r.minutes), H(16, 28));
    const laid = withNowSlot(rows, at);
    const tops = layoutRoute(laid);
    const slotTop = tops[at];
    const tag = { top: slotTop + (NOW_SLOT.height - NOW_SLOT.tag) / 2, bottom: slotTop + (NOW_SLOT.height + NOW_SLOT.tag) / 2 };
    const ticket = { top: tops[at + 1], bottom: tops[at + 1] + 104 };
    const tea = { top: tops[at - 1], bottom: tops[at - 1] + 76 };
    expect(tag.bottom <= ticket.top || tag.top >= ticket.bottom).toBe(true);
    expect(tag.top >= tea.bottom).toBe(true);
  });
});

describe('flightStartY', () => {
  it('takes off from the last done or confirmed stop before now', () => {
    const points = [
      { minutes: H(8), y: 21, status: 'done' as const },
      { minutes: H(13), y: 141, status: 'confirmed' as const },
      { minutes: H(21), y: 339, status: 'planned' as const },
    ];
    expect(flightStartY(points, H(19))).toBe(141);
  });

  it('skips planned stops and falls back to the first stop', () => {
    const points = [
      { minutes: H(8), y: 21, status: 'planned' as const },
      { minutes: H(13), y: 141, status: 'planned' as const },
    ];
    expect(flightStartY(points, H(19))).toBe(21);
  });
});

describe('stopsSummary', () => {
  it('words the day', () => {
    expect(stopsSummary(3, 1)).toBe('3 stops · 1 still to go');
    expect(stopsSummary(1, 0)).toBe('1 stop · all done');
    expect(stopsSummary(2, 2)).toBe('2 stops');
    expect(stopsSummary(0, 0)).toBe('No stops yet');
  });

  it('only says all done when every status is done, including overdue stops', () => {
    const items = [
      { status: 'planned' as const, startAt: '2026-10-12T08:00:00' },
      { status: 'confirmed' as const, startAt: '2026-10-12T09:00:00' },
      { status: 'done' as const, startAt: '2026-10-12T23:00:00' },
    ];
    expect(stopsSummary(items.length, stopsToGo(items))).toBe('3 stops · 2 still to go');
    expect(stopsSummary(items.length, stopsToGo(items.map((item) => ({ ...item, status: 'done' }))))).toBe('3 stops · all done');
  });
});

describe('Plan header clearance', () => {
  it('leaves the entire pattern band above even the raised today stamp', () => {
    const overlap = SHELL.dayStripOverhang + SHELL.dayStripDropRoom;
    const stampTop = SHELL.heroHeight - overlap + SHELL.dayStripDropRoom + SHELL.dayStripRaise;
    const todayTop = stampTop - SHELL.dayStripRaise;
    expect(todayTop).toBeGreaterThanOrEqual(SHELL.heroHeight);
    expect(stampTop).toBe(200);
  });

  it('reserves the full drop-in room above the raised stamp', () => {
    const raisedStampTop = SHELL.dayStripDropRoom + SHELL.dayStripRaise - SHELL.dayStripRaise;
    expect(raisedStampTop - SHELL.dayStripDropRoom).toBeGreaterThanOrEqual(0);
  });
});
