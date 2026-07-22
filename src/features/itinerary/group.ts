/**
 * Pure grouping logic for the itinerary list: items grouped by local
 * calendar day, days sorted ascending, untimed items collected in an
 * "Unscheduled" section that always sorts last.
 */
import { dayKey, formatDayHeader } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';

export const UNSCHEDULED_KEY = 'unscheduled';

export interface ItineraryDaySection {
  key: string;
  title: string;
  items: ItineraryItem[];
}

export function groupItineraryByDay(items: ItineraryItem[]): ItineraryDaySection[] {
  const byDay = new Map<string, ItineraryItem[]>();
  for (const item of items) {
    const key = item.startAt ? dayKey(item.startAt) : UNSCHEDULED_KEY;
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else byDay.set(key, [item]);
  }

  const sections: ItineraryDaySection[] = [];
  const dayKeys = [...byDay.keys()]
    .filter((k) => k !== UNSCHEDULED_KEY)
    .sort((a, b) => a.localeCompare(b));

  for (const key of dayKeys) {
    const dayItems = (byDay.get(key) as ItineraryItem[]).sort((a, b) => {
      const timeDiff =
        new Date(a.startAt as string).getTime() - new Date(b.startAt as string).getTime();
      return timeDiff !== 0 ? timeDiff : a.sortOrder - b.sortOrder;
    });
    sections.push({
      key,
      title: formatDayHeader(dayItems[0].startAt as string),
      items: dayItems,
    });
  }

  const unscheduled = byDay.get(UNSCHEDULED_KEY);
  if (unscheduled) {
    sections.push({
      key: UNSCHEDULED_KEY,
      title: 'Unscheduled',
      items: unscheduled.sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  return sections;
}
