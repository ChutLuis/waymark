import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export interface Box {
  width: number;
  height: number;
}

/**
 * The laid-out size of a view, for SVG fills that must track it. On Android,
 * react-native-svg keeps a percentage width/height from the first layout: a
 * stripe band or pattern drawn with `width="100%"` stopped short after its
 * container grew (a card gaining a row, the trip header expanding from the
 * card). Drawing with measured numbers re-renders the shape on every resize.
 */
export function useMeasuredBox(): [Box | null, (event: LayoutChangeEvent) => void] {
  const [box, setBox] = useState<Box | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);
  return [box, onLayout];
}
