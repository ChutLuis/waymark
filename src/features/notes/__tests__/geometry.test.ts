import { describe, expect, it } from 'vitest';
import { typeScale } from '../../../theme/tokens';
import { letterRules, postcardNoteGeometry, SEALED_NOTE, sealedNoteGeometry } from '../geometry';

const lineHeight = typeScale.letter.lineHeight!;
const kickerLineHeight = typeScale.tagSm.lineHeight!;

describe('scale-aware note geometry', () => {
  it.each([1, 1.3, 2])('keeps the closed paper inside the envelope at %sx', (fontScale) => {
    const geo = sealedNoteGeometry({ fontScale, lineHeight, kickerLineHeight });
    expect(SEALED_NOTE.letterTop + geo.closedLetterHeight).toBeLessThanOrEqual(SEALED_NOTE.sealed);
    expect(geo.closedLetterBottom).toBeLessThanOrEqual(SEALED_NOTE.sealed);
  });

  it.each([1, 1.3, 2])('clears all four written lines and rules above the open pocket at %sx', (fontScale) => {
    const geo = sealedNoteGeometry({ fontScale, lineHeight, kickerLineHeight });
    expect(geo.rulePitch).toBeCloseTo(lineHeight * fontScale);
    expect(geo.textBottom).toBeLessThan(geo.pocketTop);
    expect(SEALED_NOTE.letterTop + geo.ruleFirst + 3 * geo.rulePitch).toBeLessThan(geo.pocketTop);
    expect(geo.openLetterHeight).toBeGreaterThanOrEqual(geo.bodyTop + 4 * geo.rulePitch);
  });

  it.each([1, 1.3, 2])('fits a three-line postcard message at %sx', (fontScale) => {
    const geo = postcardNoteGeometry(fontScale, lineHeight, kickerLineHeight);
    expect(geo.minHeight).toBeGreaterThanOrEqual(28 + 2 + kickerLineHeight * fontScale + 8 + geo.messageHeight);
    expect(geo.minHeight).toBeGreaterThanOrEqual(118);
  });

  it('retains the original 280-point opening at the default scale', () => {
    expect(sealedNoteGeometry({ fontScale: 1, lineHeight, kickerLineHeight }).open).toBe(280);
  });

  it('makes extra clearance for a wrapped kicker and native font metrics', () => {
    const geo = sealedNoteGeometry({
      fontScale: 2,
      lineHeight,
      kickerLineHeight,
      measuredBodyTop: 80,
      measuredTextHeight: 190,
    });
    expect(geo.textBottom).toBeLessThan(geo.pocketTop);
    expect(geo.openLetterHeight).toBeGreaterThanOrEqual(280);
  });

  it('places each rule on the corresponding measured native baseline', () => {
    const lines = Array.from({ length: 5 }, (_, i) => ({ y: i * 28.6, height: 28.6, ascender: 23 }));
    const rules = letterRules(lines);
    expect(rules.offsets).toHaveLength(4);
    rules.offsets.forEach((offset, index) => expect(offset).toBeCloseTo(index * 28.6 + 23));
    expect(rules.textHeight).toBeCloseTo(4 * 28.6);
  });
});
