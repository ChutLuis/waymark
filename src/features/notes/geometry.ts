/** Envelope dimensions from Airmail 06, in points. */
export const SEALED_NOTE = {
  sealed: 150,
  body: 150,
  pocket: 104,
  flap: 78,
  letterInset: 16,
  letterTop: 8,
  sealBox: 58,
  sealTop: 38,
  disc: 42,
  ringR: 27,
  ringStroke: 3,
  perspective: 700,
  tilt: -1.4,
  letterPadding: 10,
  bodyGap: 6,
  pocketClearance: 4,
  writtenLines: 4,
} as const;

export function sealedNoteGeometry({
  fontScale,
  lineHeight,
  kickerLineHeight,
  measuredBodyTop,
  measuredTextHeight,
}: {
  fontScale: number;
  lineHeight: number;
  kickerLineHeight: number;
  measuredBodyTop?: number;
  measuredTextHeight?: number;
}) {
  const rulePitch = lineHeight * fontScale;
  const bodyTop = Math.max(
    SEALED_NOTE.letterPadding + kickerLineHeight * fontScale + SEALED_NOTE.bodyGap,
    measuredBodyTop ?? 0,
  );
  const textHeight = Math.max(SEALED_NOTE.writtenLines * rulePitch, measuredTextHeight ?? 0);
  const textBottom = SEALED_NOTE.letterTop + bodyTop + textHeight;
  const openLetterHeight = Math.max(152, bodyTop + textHeight + SEALED_NOTE.letterPadding);
  const open = Math.max(280, textBottom + SEALED_NOTE.body + SEALED_NOTE.pocketClearance);
  return {
    closedLetterHeight: SEALED_NOTE.sealed - SEALED_NOTE.letterTop,
    closedLetterBottom: SEALED_NOTE.sealed,
    openLetterHeight,
    open,
    bodyTop,
    textBottom,
    pocketTop: open - SEALED_NOTE.body,
    ruleFirst: bodyTop + rulePitch,
    rulePitch,
  };
}

/** The postcard can grow further in normal flow if its kicker wraps. */
export function postcardNoteGeometry(fontScale: number, lineHeight: number, kickerLineHeight: number) {
  const messageHeight = 3 * lineHeight * fontScale;
  const minHeight = Math.max(118, 28 + 2 + kickerLineHeight * fontScale + 8 + messageHeight);
  return { minHeight, messageHeight };
}

export interface NoteTextLine {
  y: number;
  height: number;
  ascender: number;
}

/** Native baselines keep the ink on its rules, including Android font metrics. */
export function letterRules(lines: readonly NoteTextLine[]) {
  const written = lines.slice(0, SEALED_NOTE.writtenLines);
  return {
    offsets: written.map((line) => line.y + line.ascender),
    textHeight: Math.max(0, ...written.map((line) => line.y + line.height)),
  };
}
