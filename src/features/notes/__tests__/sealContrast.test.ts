import { describe, expect, it } from 'vitest';
import { motion, palettes } from '../../../theme/tokens';

function luminance(hex: string) {
  const linear = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

describe('seal privacy affordance', () => {
  it.each(['light', 'dark'] as const)('has a >= 3:1 progress ring against %s kraft', (theme) => {
    const { kraft, kraftInk } = palettes[theme];
    const background = luminance(kraft);
    const progress = luminance(kraftInk);
    const ratio = (Math.max(background, progress) + 0.05) / (Math.min(background, progress) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('keeps the privacy hold at exactly 600 milliseconds', () => {
    expect(motion.duration.hold).toBe(600);
  });
});
