/**
 * Stamp perforation geometry (audit override 1).
 *
 * Hole centres sit on the stamp's outer edges (0 and `length`), spaced close to
 * `pitch` apart. If a side isn't a whole multiple of the pitch the holes are
 * spread evenly so that both corners still get a hole.
 *
 * Pure module so it can be unit-tested without the React Native renderer.
 */
export function perforationOffsets(length: number, pitch: number): number[] {
  if (!(length > 0) || !(pitch > 0)) return [0];
  const rounded = Math.max(1, Math.round(length / pitch));
  const out: number[] = [];
  for (let i = 0; i <= rounded; i += 1) out.push((i * length) / rounded);
  return out;
}