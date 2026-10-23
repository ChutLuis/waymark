import { useRouter } from 'expo-router';
import { markTripJustCreated } from '@/features/invites/TripCreatedInviteToast';
import { CreateTripSheet } from '@/features/trips/CreateTripSheet';
import { primeShell } from '@/features/trips/expandStore';

/**
 * Route wrapper so "start a trip" is deep-linkable; presented as a
 * transparent modal with the Sheet supplying its own scrim.
 */
export default function NewTripScreen() {
  const router = useRouter();
  return (
    <CreateTripSheet
      visible
      // A deep link opens this with nothing underneath to go back to.
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onCreated={(trip) => {
        markTripJustCreated(trip.id);
        primeShell(false);
        router.replace(`/trips/${trip.id}` as never);
      }}
    />
  );
}
