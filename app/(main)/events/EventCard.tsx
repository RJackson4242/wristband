import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "../../../components/ui/button";
import { Separator } from "../../../components/ui/separator";
import { Badge } from "../../../components/ui/badge";
import RsvpActions from "./RsvpActions";
import { AttendeeList } from "./AttendeeList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditEventDialog } from "./EditEventDialog";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

type RsvpStatus = "yes" | "no" | "maybe" | "pending";

interface EventCardProps {
  _id: Id<"events">;
  name?: string;
  bandId: Id<"bands">;
  bandName: string;
  type: string;
  description?: string;
  startTime: number;
  location?: string;
  rsvpStatus: RsvpStatus | undefined;
  attendingCount: number;
  rsvpCount: number;
  isAdmin: boolean;
  showBandName?: boolean;
  disableRSVP?: boolean;
}

export function EventCard({
  _id,
  name,
  bandId,
  bandName,
  type,
  description,
  startTime,
  location,
  rsvpStatus,
  attendingCount,
  rsvpCount,
  isAdmin,
  showBandName = false,
  disableRSVP = false,
}: EventCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const setRsvp = useMutation(api.rsvps.updateStatus);
  const deleteEvent = useMutation(api.events.remove);

  const handleRsvp = async (e: React.MouseEvent, status: RsvpStatus) => {
    e.stopPropagation();
    try {
      await setRsvp({ eventId: _id, status });
      toast.success("RSVP updated");
    } catch (error) {
      const msg =
        error instanceof ConvexError
          ? (error.data as string)
          : "Unexpected error";
      toast.error("Action Failed", { description: msg });
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to cancel this event?")) {
      try {
        await deleteEvent({ eventId: _id });
        toast.success("Event cancelled");
        setIsOpen(false);
      } catch (error) {
        const msg =
          error instanceof ConvexError
            ? (error.data as string)
            : "Unexpected error";
        toast.error("Action Failed", { description: msg });
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Card className="hover:shadow-md hover:cursor-pointer">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex justify-between items-center w-full">
                <CardTitle className="truncate pr-2 capitalize">
                  {name || type}
                </CardTitle>

                <div className="flex gap-2 shrink-0">
                  <Badge className="capitalize">{type}</Badge>
                  {rsvpStatus && (
                    <Badge
                      variant={rsvpStatus === "yes" ? "default" : "outline"}
                    >
                      {rsvpStatus === "pending"
                        ? "Pending"
                        : rsvpStatus === "maybe"
                          ? "Maybe Going"
                          : rsvpStatus === "no"
                            ? "Not Going"
                            : "Going"}
                    </Badge>
                  )}
                </div>
              </div>

              <CardDescription>
                {showBandName && <p>{bandName}</p>}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(startTime, "EEE, MMM do @ h:mm a")}</span>
              </div>
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{location}</span>
                </div>
              )}
              {rsvpCount !== 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    {attendingCount} / {rsvpCount} Attending
                  </span>
                </div>
              )}
              {description && (
                <p className="line-clamp-2 text-muted-foreground mt-2">
                  {description}
                </p>
              )}
            </CardContent>

            {rsvpStatus === "pending" && disableRSVP === false && (
              <CardFooter>
                <RsvpActions currentRsvp={rsvpStatus} onRsvp={handleRsvp} />
              </CardFooter>
            )}
          </Card>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl capitalize leading-tight">
                  {name || type}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {bandName}
                </DialogDescription>
              </div>

              <div className="flex gap-2 shrink-0 pr-8">
                <Badge className="capitalize">{type}</Badge>
                {rsvpStatus && (
                  <Badge variant={rsvpStatus === "yes" ? "default" : "outline"}>
                    {rsvpStatus === "pending"
                      ? "Pending"
                      : rsvpStatus === "maybe"
                        ? "Maybe Going"
                        : rsvpStatus === "no"
                          ? "Not Going"
                          : "Going"}
                  </Badge>
                )}
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="w-4 h-4" />
                        <span className="sr-only">Event Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto">
                      <DropdownMenuItem
                        onClick={() => setIsEditOpen(true)}
                        className="whitespace-nowrap pr-2"
                      >
                        <Edit className="w-4 h-4 mr-2" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive focus:bg-destructive whitespace-nowrap pr-2"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(startTime, "EEE, MMM do @ h:mm a")}
                </span>
              </div>

              {location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{location}</span>
                </div>
              )}

              {isOpen && (
                <div className="rounded-md border p-3 bg-muted/10">
                  <AttendeeList eventId={_id} />
                </div>
              )}
            </div>

            {description && (
              <div className="rounded-md bg-muted/10 border p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Description
                </h4>
                <p className="text-sm text-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            )}
            <Separator className="my-1" />
            <div className="space-y-2">
              <div>
                <span className="font-medium text-sm">Update Status</span>
              </div>
              <div className="flex justify-center">
                <RsvpActions currentRsvp={rsvpStatus} onRsvp={handleRsvp} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <EditEventDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        eventId={_id}
        initialData={{
          bandId,
          name,
          type,
          startTime,
          location,
          description,
        }}
      />
    </>
  );
}
