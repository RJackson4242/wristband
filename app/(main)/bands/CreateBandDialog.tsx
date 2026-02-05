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
import { useMutation } from "convex/react";
import { useState } from "react";
import { BandForm } from "./BandForm";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

export function CreateBandDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const createBand = useMutation(api.bands.create);

  const handleCreate = async (name: string) => {
    try {
      await createBand({ name });
      toast.success("Band created");
      setIsOpen(false);
    } catch (error) {
      const msg =
        error instanceof ConvexError
          ? (error.data as string)
          : "Unexpected error";
      toast.error("Action failed", { description: msg });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Create New Band</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Band</DialogTitle>
          <DialogDescription>Create a new band.</DialogDescription>
        </DialogHeader>

        <BandForm onSubmit={handleCreate} />
      </DialogContent>
    </Dialog>
  );
}
