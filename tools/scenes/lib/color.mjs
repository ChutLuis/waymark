// Colour helpers. Colours are '#RRGGBB' strings at the authoring level and
// [r, g, b] (0..1) arrays when emitted into Lottie.

/** '#RRGGBB' -> [r, g, b] in 0..1. Arrays pass through. */
export function rgb(c) {
  if (Array.isArray(c)) return c.slice(0, 3);
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** [r, g, b] in 0..1 -> '#RRGGBB'. */
export function hex(c) {
  const [r, g, b] = rgb(c);
  const h = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** Linear mix of two colours, t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
  const x = rgb(a);
  const y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}

export const lighten = (c, t) => mix(c, '#FFFFFF', t);
export const darken = (c, t) => mix(c, '#000000', t);

/** Relative luminance (WCAG). */
export function luminance(c) {
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb(c).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
