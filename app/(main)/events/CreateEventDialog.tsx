import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

interface CreateEventDialogProps {
  bandId?: Id<"bands">;
}

export function CreateEventDialog({
  bandId: defaultBandId,
}: CreateEventDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [selectedBandId, setSelectedBandId] = useState<string>("");
  const [name, setName] = useState("");
  const [type, setType] = useState("rehearsal");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const userBands = useQuery(api.memberships.getUserMemberships) || [];
  const createEvent = useMutation(api.events.create);

  const eventTypes = ["rehearsal", "gig", "meeting", "recording", "other"];

  const finalBandId = defaultBandId || (selectedBandId as Id<"bands">);
  const isValid = !!finalBandId && startTime.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    await createEvent({
      bandId: finalBandId,
      name: name.trim() || undefined,
      type: type as "rehearsal" | "gig" | "recording" | "meeting" | "other",
      startTime: new Date(startTime).getTime(),
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    });

    setIsOpen(false);
    setName("");
    setType("rehearsal");
    setStartTime("");
    setLocation("");
    setDescription("");
    setSelectedBandId("");
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Create New Event</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
          <DialogDescription>Create a new event.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter event name (optional)"
              className="col-span-3"
              autoFocus
            />
          </div>

          {!defaultBandId && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="band" className="text-right">
                Band
              </Label>
              <div className="col-span-3">
                <Select
                  value={selectedBandId}
                  onValueChange={setSelectedBandId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select band" />
                  </SelectTrigger>
                  <SelectContent>
                    {userBands.map((membership) => (
                      <SelectItem
                        key={membership.bandId}
                        value={membership.bandId}
                      >
                        {membership.bandName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-base">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Date & Time
            </Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="col-span-3 block"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location name (optional)"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right mt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              className="col-span-3 resize-none max-h-50 overflow-y-auto"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid}>
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
