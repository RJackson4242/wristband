import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { EventForm, EventFormData } from "./EventForm";
import { ConvexError } from "convex/values";

interface CreateEventDialogProps {
  bandId?: Id<"bands">;
}

export function CreateEventDialog({
  bandId: defaultBandId,
}: CreateEventDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createEvent = useMutation(api.events.create);

  const handleCreate = async (data: EventFormData) => {
    try {
      await createEvent({
        ...data,
        bandId: data.bandId || defaultBandId!,
      });

      toast.success("Event created");
      setIsOpen(false);
    } catch (error) {
      const msg =
        error instanceof ConvexError
          ? (error.data as string)
          : "Unexpected error";
      toast.error("Action Failed", { description: msg });
    }
  };

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

        <EventForm
          onSubmit={handleCreate}
          submitLabel="Create Event"
          fixedBandId={defaultBandId}
        />
      </DialogContent>
    </Dialog>
  );
}
