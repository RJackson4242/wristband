"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { CreateBandForm } from "./CreateBandForm";

export function CreateBandMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
        <DialogTrigger className="w-full cursor-pointer gap-2">
          <span>+ Create New Band</span>
        </DialogTrigger>
      </DropdownMenuItem>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Band</DialogTitle>
          <DialogDescription>Add a new band to your profile.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <CreateBandForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}