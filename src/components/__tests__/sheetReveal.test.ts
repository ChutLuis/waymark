import { describe, expect, it } from 'vitest';
import { revealOffset } from '../sheetReveal';

const view = (offset: number, height = 400, contentHeight = 2000) => ({ offset, height, contentHeight });

describe('revealOffset', () => {
  it('leaves a target that already shows in full', () => {
    expect(revealOffset({ top: 100, height: 200 }, view(0), 8)).toBeNull();
    expect(revealOffset({ top: 500, height: 100 }, view(300), 8)).toBeNull();
  });

  it('scrolls down just far enough to show a target below the fold', () => {
    // Bottom 900 + 8 margin, minus the 400 pt viewport.
    expect(revealOffset({ top: 600, height: 300 }, view(0), 8)).toBe(508);
  });

  it('scrolls up to a target above the viewport', () => {
    expect(revealOffset({ top: 100, height: 100 }, view(600), 8)).toBe(92);
  });

  it('aligns the top of a target taller than the viewport', () => {
    expect(revealOffset({ top: 700, height: 900 }, view(0), 8)).toBe(692);
    expect(revealOffset({ top: 700, height: 900 }, view(1200), 8)).toBe(692);
    expect(revealOffset({ top: 700, height: 900 }, view(692), 8)).toBeNull();
  });

  it('stays inside the content', () => {
    expect(revealOffset({ top: 4, height: 100 }, view(300), 8)).toBe(0);
    expect(revealOffset({ top: 1800, height: 200 }, view(0, 400, 2000), 8)).toBe(1600);
  });

  it('does nothing before the viewport has a size', () => {
    expect(revealOffset({ top: 600, height: 300 }, view(0, 0), 8)).toBeNull();
  });
});
