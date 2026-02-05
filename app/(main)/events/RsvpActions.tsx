import { Button } from "../../../components/ui/button";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";

type RsvpStatus = "yes" | "no" | "maybe" | "pending";

interface RsvpActionsProps {
  currentRsvp: RsvpStatus | undefined;
  onRsvp: (e: React.MouseEvent, status: RsvpStatus) => void;
}

export default function RsvpActions({ currentRsvp, onRsvp }: RsvpActionsProps) {
  return (
    <div>
      <Button
        variant={currentRsvp === "yes" ? "default" : "outline"}
        onClick={(e) => onRsvp(e, "yes")}
      >
        <CheckCircle2 /> Yes
      </Button>
      <Button
        variant={currentRsvp === "maybe" ? "default" : "outline"}
        onClick={(e) => onRsvp(e, "maybe")}
      >
        <HelpCircle /> Maybe
      </Button>
      <Button
        variant={currentRsvp === "no" ? "default" : "outline"}
        onClick={(e) => onRsvp(e, "no")}
      >
        <XCircle /> No
      </Button>
    </div>
  );
}
