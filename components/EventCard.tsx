import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Edit, Trash2, MapPin, Calendar, Users } from "lucide-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import RsvpActions from "./RsvpActions";

type RsvpStatus = "yes" | "no" | "maybe" | "pending";

interface EventCardProps {
  id: Id<"events">;
  title: string;
  bandName?: string;
  type: string;
  description?: string;
  startTime: number;
  location?: string;
  currentRsvp: RsvpStatus;
  attendingCount: number;
  totalMembers: number;
  isAdmin: boolean;
  showBandName?: boolean;
}

export function EventCard({
  id,
  title,
  bandName,
  type,
  description,
  startTime,
  location,
  currentRsvp,
  attendingCount,
  totalMembers,
  isAdmin,
  showBandName = false,
}: EventCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const setRsvp = useMutation(api.rsvps.updateStatus);
  const deleteEvent = useMutation(api.events.remove);
  const handleRsvp = (e: React.MouseEvent, status: RsvpStatus) => {
    e.stopPropagation(); // Prevents the card click (Dialog)
    setRsvp({ eventId: id, status });
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to cancel this event?")) {
      await deleteEvent({ eventId: id });
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card>
          <CardHeader>
            <div>
              <Badge variant="secondary">{type}</Badge>
              <Badge variant={currentRsvp === "yes" ? "default" : "outline"}>
                {currentRsvp === "pending" ? "Action Needed" : currentRsvp}
              </Badge>
            </div>

            <div>
              <CardTitle>{title}</CardTitle>
              {showBandName && bandName && <p>{bandName}</p>}
            </div>
          </CardHeader>

          <CardContent>
            <div>
              <div>
                <Calendar />
                <span>{format(startTime, "EEE, MMM do @ h:mm a")}</span>
              </div>
              {location && (
                <div>
                  <MapPin />
                  <span className="truncate">{location}</span>
                </div>
              )}
              <div>
                <Users />
                <span>
                  {attendingCount} / {totalMembers} Attending
                </span>
              </div>
            </div>

            {description && <p>{description}</p>}
          </CardContent>

          {currentRsvp === "pending" && (
            <CardFooter>
              <RsvpActions currentRsvp={currentRsvp} onRsvp={handleRsvp} />
            </CardFooter>
          )}
        </Card>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <div>
            <Badge variant="outline">{type}</Badge>
            <span>{format(startTime, "MMMM do, yyyy")}</span>
          </div>
          <DialogTitle>{title}</DialogTitle>
          {bandName && <DialogDescription>{bandName}</DialogDescription>}
        </DialogHeader>

        <div>
          <div>
            <div>
              <span>
                <Calendar /> Start Time
              </span>
              <p>{format(startTime, "h:mm a")}</p>
            </div>
            {location && (
              <div>
                <span>
                  <MapPin /> Location
                </span>
                <p>{location}</p>
              </div>
            )}
          </div>

          {description && (
            <div>
              <h4>Description</h4>
              <p>{description}</p>
            </div>
          )}

          <Separator />

          <div>
            <div>
              <h4>Update Your RSVP</h4>
              <span>
                Current: <span>{currentRsvp}</span>
              </span>
            </div>
            <RsvpActions
              currentRsvp={currentRsvp}
              onRsvp={handleRsvp}
              isDialog={true}
            />
          </div>
        </div>

        {isAdmin && (
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 /> Delete Event
            </Button>

            <Button variant="outline" size="sm">
              <Edit /> Edit Details
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
