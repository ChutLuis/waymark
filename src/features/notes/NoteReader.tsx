import { useState } from 'react';
import { AppText } from '@/components/AppText';
import { Sheet } from '@/components/Sheet';
import type { TripNote } from '@/lib/types';

interface NoteReaderProps {
  note: TripNote | null;
  author: string;
  dateLabel: string;
  onClose: () => void;
  /** After the reader has fully closed (open the editor from here). */
  onClosed?: () => void;
  onEdit?: () => void;
}

/** Sheet owns scrolling; the full message is never line-clamped here. */
export function NoteReader({ note, author, dateLabel, onClose, onClosed, onEdit }: NoteReaderProps) {
  // Keep showing the last note while the sheet fades out after `note` clears.
  const [shown, setShown] = useState({ note, author, dateLabel });
  if (note && (note !== shown.note || author !== shown.author || dateLabel !== shown.dateLabel)) {
    setShown({ note, author, dateLabel });
  }

  return (
    <Sheet
      visible={note !== null}
      title="Shared note"
      cancelLabel="Done"
      onClose={onClose}
      onClosed={onClosed}
      actionLabel={onEdit ? 'Edit' : undefined}
      onAction={onEdit}
    >
      <AppText role="bodySm" tone="secondary">
        From {shown.author} · {shown.dateLabel}
      </AppText>
      <AppText role="letter" selectable>{shown.note?.body}</AppText>
    </Sheet>
  );
}
