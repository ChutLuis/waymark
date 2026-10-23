import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { onlineManager } from '@tanstack/react-query';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import type { Trip } from '@/lib/types';
import { OFFLINE_MESSAGE, failureMessage } from './errors';
import { useDeleteTrip } from './hooks';

interface DeleteTripSheetProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
}

/** Deleting is confirmed by typing the trip name (per the design note). */
export function DeleteTripSheet({ visible, onClose, trip }: DeleteTripSheetProps) {
  const router = useRouter();
  const deleteTrip = useDeleteTrip();
  const [typedName, setTypedName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const deleting = deleteTrip.isPending;

  // Reset the confirmation field and any failure each time the sheet reopens.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTypedName('');
      setError(null);
    }
  }

  const matches = typedName.trim() === trip.name;

  const fail = (message: string) => {
    setError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const onDelete = async () => {
    if (deleting) return;
    // Offline, the mutation would wait for the connection instead of failing.
    if (!onlineManager.isOnline()) {
      fail(OFFLINE_MESSAGE);
      return;
    }
    setError(null);
    try {
      await deleteTrip.mutateAsync(trip.id);
    } catch (cause) {
      fail(failureMessage(cause, 'Couldn’t delete the trip. Try again.'));
      return;
    }
    onClose();
    router.replace('/');
  };

  // The sheet stays open while deleting, so a failure has somewhere to show.
  return (
    <Sheet visible={visible} title="Delete trip" onClose={deleting ? () => {} : onClose}>
      <AppText role="bodySm" tone="secondary">
        This removes the itinerary, packing list, notes, and invites for everyone on the
        trip. It cannot be undone.
      </AppText>
      <TextField
        label={`Type "${trip.name}" to confirm`}
        value={typedName}
        onChangeText={setTypedName}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <Button
        label="Delete trip"
        variant="destructive"
        disabled={!matches}
        loading={deleting}
        onPress={onDelete}
      />
    </Sheet>
  );
}
