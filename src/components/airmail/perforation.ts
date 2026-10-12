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
const n = (v: number) => Number(v.toFixed(3));

/**
 * The perforated stamp's outline as an SVG path: the frame rectangle with a
 * half-circle notch for every hole along each side and a quarter notch at each
 * corner, traced clockwise. It draws the stamp's shadow as a plain shape,
 * because Android applies a mask after a filter, which would cut the blur back
 * to the outline. Without perforations it is the plain rectangle.
 */
export function stampOutline(
  width: number,
  height: number,
  pitch: number,
  radius: number,
  perforated = true,
): string {
  const w = width;
  const h = height;
  if (!perforated) return `M0 0H${n(w)}V${n(h)}H0Z`;
  const r = radius;
  const xs = perforationOffsets(w, pitch).slice(1, -1);
  const ys = perforationOffsets(h, pitch).slice(1, -1);
  // Every notch curves into the frame; tracing clockwise that is sweep 0.
  const arc = (x: number, y: number) => `A${n(r)} ${n(r)} 0 0 0 ${n(x)} ${n(y)}`;
  const d: string[] = [`M${n(r)} 0`];
  for (const x of xs) d.push(`L${n(x - r)} 0`, arc(x + r, 0));
  d.push(`L${n(w - r)} 0`, arc(w, r));
  for (const y of ys) d.push(`L${n(w)} ${n(y - r)}`, arc(w, y + r));
  d.push(`L${n(w)} ${n(h - r)}`, arc(w - r, h));
  for (const x of [...xs].reverse()) d.push(`L${n(x + r)} ${n(h)}`, arc(x - r, h));
  d.push(`L${n(r)} ${n(h)}`, arc(0, h - r));
  for (const y of [...ys].reverse()) d.push(`L0 ${n(y + r)}`, arc(0, y - r));
  d.push(`L0 ${n(r)}`, arc(r, 0), 'Z');
  return d.join('');
}
