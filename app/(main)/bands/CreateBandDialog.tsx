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
          <DialogDescription>Create a new band.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Band Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter band name"
              className="col-span-3"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!isValid}>
              Create Band
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
