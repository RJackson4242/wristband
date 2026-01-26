import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export function CreateBandDialog() {
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isValid = name.trim().length > 0;
  const createBand = useMutation(api.bands.create);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    await createBand({ name });
    setIsOpen(false);
    setName("");
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Create New Band</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Band</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Band Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter band name"
            />
          </div>
          <Button type="submit" disabled={!isValid}>
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
