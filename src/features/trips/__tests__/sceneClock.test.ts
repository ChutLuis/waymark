import { describe, expect, it } from 'vitest';
import { SCENE_FRAMES, sceneFrameAt } from '../sceneClock';

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
