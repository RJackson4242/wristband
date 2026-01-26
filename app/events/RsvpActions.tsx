import { Button } from "../../components/ui/button";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";

type RsvpStatus = "yes" | "no" | "maybe" | "pending";

interface RsvpActionsProps {
  currentRsvp: RsvpStatus;
  onRsvp: (e: React.MouseEvent, status: RsvpStatus) => void;
  isDialog?: boolean;
}

export default function RsvpActions({
  currentRsvp,
  onRsvp,
  isDialog = false,
}: RsvpActionsProps) {
  return (
    <div className={`${isDialog ? "justify-end" : ""}`}>
      <Button
        size="sm"
        variant={currentRsvp === "yes" ? "default" : "outline"}
        className={isDialog ? "" : "flex-1"}
        onClick={(e) => onRsvp(e, "yes")}
      >
        <CheckCircle2 className="w-4 h-4 mr-2" /> Yes
      </Button>
      <Button
        size="sm"
        variant={currentRsvp === "maybe" ? "default" : "outline"}
        className={isDialog ? "" : "flex-1"}
        onClick={(e) => onRsvp(e, "maybe")}
      >
        <HelpCircle className="w-4 h-4 mr-2" /> Maybe
      </Button>
      <Button
        size="sm"
        variant={currentRsvp === "no" ? "destructive" : "outline"}
        className={isDialog ? "" : "flex-1"}
        onClick={(e) => onRsvp(e, "no")}
      >
        <XCircle className="w-4 h-4 mr-2" /> No
      </Button>
    </div>
  );
}
