import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import { useQuery } from "convex/react";
import { useState } from "react";

export interface EventFormData {
  bandId: Id<"bands">;
  name?: string;
  type: "rehearsal" | "gig" | "recording" | "meeting" | "other";
  startTime: number;
  location?: string;
  description?: string;
}

interface EventFormProps {
  initialData?: Partial<EventFormData> & { bandId?: string };
  fixedBandId?: Id<"bands">;
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel?: string;
}

export function EventForm({
  initialData,
  fixedBandId,
  onSubmit,
  submitLabel = "Save",
}: EventFormProps) {
  const userBands = useQuery(api.memberships.getUserMemberships) || [];

  const [selectedBandId, setSelectedBandId] = useState<string>(
    fixedBandId || initialData?.bandId || "",
  );
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<string>(initialData?.type || "rehearsal");

  const defaultTime = initialData?.startTime
    ? new Date(initialData.startTime).toISOString().slice(0, 16)
    : "";
  const [startTime, setStartTime] = useState(defaultTime);

  const [location, setLocation] = useState(initialData?.location || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventTypes = ["rehearsal", "gig", "meeting", "recording", "other"];
  const isValid = !!selectedBandId && startTime.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        bandId: selectedBandId as Id<"bands">,
        name: name.trim() || undefined,
        type: type as "rehearsal" | "gig" | "meeting" | "recording" | "other",
        startTime: new Date(startTime).getTime(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
          autoFocus={!initialData}
        />
      </div>

      {!fixedBandId && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="band" className="text-right">
            Band
          </Label>
          <div className="col-span-3">
            <Select value={selectedBandId} onValueChange={setSelectedBandId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select band" />
              </SelectTrigger>
              <SelectContent>
                {userBands.map(
                  (membership) =>
                    membership && (
                      <SelectItem
                        key={membership.bandId}
                        value={membership.bandId}
                      >
                        {membership.bandName}
                      </SelectItem>
                    ),
                )}
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
            <SelectTrigger className="w-full capitalize">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((t) => (
                <SelectItem key={t} value={t} className="text-base capitalize">
                  {t}
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
          placeholder="Enter location (optional)"
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
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
