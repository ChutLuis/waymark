/**
 * Where a sheet's scroll view should move so that `target` (a rect in content
 * coordinates) shows with `margin` around it, or null when it already does.
 * A target taller than the viewport aligns its top instead, so its start (a
 * search field above a long list, say) stays in view.
 */
export function revealOffset(
  target: { top: number; height: number },
  view: { offset: number; height: number; contentHeight: number },
  margin: number,
): number | null {
  if (view.height <= 0) return null;
  const top = target.top - margin;
  const bottom = target.top + target.height + margin;
  let next: number | null = null;
  if (bottom - top > view.height) next = top;
  else if (top < view.offset) next = top;
  else if (bottom > view.offset + view.height) next = bottom - view.height;
  if (next === null) return null;
  const clamped = Math.max(0, Math.min(next, view.contentHeight - view.height));
  return Math.abs(clamped - view.offset) < 1 ? null : clamped;
}
