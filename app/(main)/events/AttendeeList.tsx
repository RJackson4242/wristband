import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { User } from "lucide-react";

interface AttendeeListProps {
  eventId: Id<"events">;
}

export function AttendeeList({ eventId }: AttendeeListProps) {
  const attendees = useQuery(api.events.getEventAttendees, { eventId });

  if (attendees === undefined) {
    return "Loading...";
  }

  if (attendees.length === 0) {
    return "No RSVPs yet.";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Guest List
        </h4>
        <span className="text-xs text-muted-foreground">
          {attendees.length} total
        </span>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2">
        {attendees.map((attendee) => (
          <div
            key={attendee.userId}
            className="flex items-center justify-between text-sm group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="font-medium truncate max-w-40">
                {attendee.displayName}
              </span>
            </div>

            <Badge
              variant={attendee.status === "yes" ? "default" : "outline"}
              className="capitalize font-normal"
            >
              {attendee.status === "pending"
                ? "Pending"
                : attendee.status === "maybe"
                  ? "Maybe"
                  : attendee.status === "no"
                    ? "Not Going"
                    : "Going"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
