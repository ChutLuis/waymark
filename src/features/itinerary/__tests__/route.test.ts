import { describe, expect, it } from 'vitest';
import { flightStartY, layoutRoute, routeYAt, stopsSummary } from '../route';

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
});
