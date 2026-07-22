import { useRouter } from 'expo-router';
import { CreateTripSheet } from '@/features/trips/CreateTripSheet';

/**
 * Route wrapper so "start a trip" is deep-linkable; presented as a
 * transparent modal with the Sheet supplying its own scrim.
 */
export default function NewTripScreen() {
  const router = useRouter();
  return (
    <CreateTripSheet
      visible
      onClose={() => router.back()}
      onCreated={(trip) => router.replace(`/trips/${trip.id}` as never)}
    />
  );
}
