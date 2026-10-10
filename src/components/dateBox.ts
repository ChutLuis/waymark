import { fontFamilies } from '@/theme';

/**
 * The date box (design §05, Dates), shared by the native and web fields. The
 * design draws the box border as an inset shadow, so its 14 pt padding is
 * measured from the outer edge; a real border takes layout space, so pad by
 * the rest and the label and value never move when the border thickens.
 */
export const DATE_BOX_INSET = 14;
export const DATE_BOX_HEIGHT = 64;
/** Label to value. */
export const DATE_BOX_GAP = 2;
/** The label is `tag` type, tracked a little wider. */
export const DATE_BOX_LABEL_TRACKING = 0.6;

/** Value type: 18/24 in the trip sheets (design), 16/20 in the item editor. */
export const dateValueType = {
  lg: { fontFamily: fontFamilies.semibold, fontSize: 18, lineHeight: 24 },
  md: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 20 },
} as const;
