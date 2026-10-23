import { AppText } from '@/components/AppText';
import { Sheet } from '@/components/Sheet';
import { RegisteredInvite } from './RegisteredInvite';

interface InviteTripSheetProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
}

/** Registered mail, one tap away from every trip tab; no invite until opened. */
export function InviteTripSheet({ visible, onClose, tripId, tripName }: InviteTripSheetProps) {
  return (
    <Sheet visible={visible} title="Invite" cancelLabel="Done" onClose={onClose}>
      <AppText role="cardTitleSm">{tripName}</AppText>
      <AppText role="bodySm" tone="secondary">
        Share this 8-character invite code with your travel companion so they can join in the app.
      </AppText>
      <RegisteredInvite tripId={tripId} tripName={tripName} presentation="sheet" />
    </Sheet>
  );
}
