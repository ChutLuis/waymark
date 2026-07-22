import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import type { Trip } from '@/lib/types';
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

  // Reset the confirmation field each time the sheet reopens.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setTypedName('');
  }

  const matches = typedName.trim() === trip.name;

  const onDelete = async () => {
    await deleteTrip.mutateAsync(trip.id);
    onClose();
    router.replace('/');
  };

  return (
    <Sheet visible={visible} title="Delete trip" onClose={onClose}>
      <AppText tone="secondary" style={{ fontSize: 15, lineHeight: 22 }}>
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
      <Button
        label="Delete trip"
        variant="destructive"
        disabled={!matches}
        loading={deleteTrip.isPending}
        onPress={onDelete}
      />
    </Sheet>
  );
}
