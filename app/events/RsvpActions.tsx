import { Button } from "../../components/ui/button";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";

type RsvpStatus = "yes" | "no" | "maybe" | "pending";

interface RsvpActionsProps {
  currentRsvp: RsvpStatus;
  onRsvp: (e: React.MouseEvent, status: RsvpStatus) => void;
}

export default function RsvpActions({ currentRsvp, onRsvp }: RsvpActionsProps) {
  return (
    <div>
      <Button
        size="sm"
        variant={currentRsvp === "yes" ? "default" : "outline"}
        onClick={(e) => onRsvp(e, "yes")}
      >
        <CheckCircle2 className="w-4 h-4 mr-2" /> Yes
      </Button>
      <Button
        size="sm"
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
