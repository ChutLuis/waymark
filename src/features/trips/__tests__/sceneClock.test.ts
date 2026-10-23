import { describe, expect, it } from 'vitest';
import { SCENE_FRAMES, sceneFrameAt, scenePhaseAt } from '../sceneClock';

describe('sceneFrameAt', () => {
  it('starts at frame 0', () => {
    expect(sceneFrameAt(1000, 1000)).toBe(0);
  });

  it('counts 30 frames a second', () => {
    expect(sceneFrameAt(2000, 1000)).toBe(30);
  });

  it('wraps every 240 frames (8 s)', () => {
    expect(sceneFrameAt(1000 + 8000, 1000)).toBe(0);
    expect(sceneFrameAt(1000 + 8000 + 1000, 1000)).toBe(30);
    expect(sceneFrameAt(1000 + 7999, 1000)).toBe(SCENE_FRAMES - 1);
  });

  it('never goes negative for a clock read before the epoch', () => {
    expect(sceneFrameAt(0, 1000)).toBe(0);
  });
});

describe('scenePhaseAt', () => {
  it('keeps procedural scenes in phase across mounts and resumes', () => {
    const homePhase = scenePhaseAt(1600, 2400, 1000);
    const headerPhase = scenePhaseAt(1600, 2400, 1000);
    expect(homePhase).toBe(0.25);
    expect(headerPhase).toBe(homePhase);
    expect(scenePhaseAt(4000, 2400, 1000)).toBe(homePhase);
  });

  it('reads elapsed time rather than restarting when a scene resumes', () => {
    expect(scenePhaseAt(2200, 2400, 1000)).toBe(0.5);
    expect(scenePhaseAt(2800, 2400, 1000)).toBe(0.75);
  });

  it('wraps smoothly at the end of each period', () => {
    expect(scenePhaseAt(3399, 2400, 1000)).toBeCloseTo(2399 / 2400);
    expect(scenePhaseAt(3400, 2400, 1000)).toBe(0);
  });

  it('parks safely for an invalid period or a read before the epoch', () => {
    expect(scenePhaseAt(500, 2400, 1000)).toBe(0);
    expect(scenePhaseAt(2000, 0, 1000)).toBe(0);
    expect(scenePhaseAt(2000, -1, 1000)).toBe(0);
  });
});
