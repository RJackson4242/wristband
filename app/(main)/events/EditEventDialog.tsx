import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { EventForm, EventFormData } from "./EventForm";

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: Id<"events">;
  initialData: {
    bandId: Id<"bands">;
    name?: string;
    type: string;
    startTime: number;
    location?: string;
    description?: string;
  };
}

export function EditEventDialog({
  open,
  onOpenChange,
  eventId,
  initialData,
}: EditEventDialogProps) {
  const updateEvent = useMutation(api.events.update);

  const handleSave = async (data: EventFormData) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bandId, ...updates } = data;
    await updateEvent({
      eventId,
      ...updates,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <EventForm
          initialData={
            initialData as Partial<EventFormData> & { bandId: string }
          }
          fixedBandId={initialData.bandId}
          onSubmit={handleSave}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
