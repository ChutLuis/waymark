/**
 * One clock for every destination scene. lottie-react-native can't read the
 * current frame on native, so scenes derive it from a shared epoch instead:
 * the Home card's scene and the trip header's scene always show the same
 * frame, and the expand into a trip never restarts the loop.
 */
export const SCENE_FPS = 30;
/** Scenes loop 240 frames (8 s). */
export const SCENE_FRAMES = 240;

export const SCENE_EPOCH = Date.now();

/**
 * Continuous loop phase for procedural scenes sharing the destination epoch.
 * The epoch is a parameter, not a default reading module scope: a worklet
 * only captures values its body references, so a default would be undefined
 * on the UI thread.
 */
export function scenePhaseAt(now: number, period: number, epoch: number): number {
  'worklet';
  if (period <= 0) return 0;
  return (Math.max(0, now - epoch) % period) / period;
}

/** The scene frame to show at `now` (ms), for a clock started at `epoch`. */
export function sceneFrameAt(now: number, epoch: number = SCENE_EPOCH): number {
  const elapsed = Math.max(0, now - epoch);
  return Math.floor((elapsed * SCENE_FPS) / 1000) % SCENE_FRAMES;
}
