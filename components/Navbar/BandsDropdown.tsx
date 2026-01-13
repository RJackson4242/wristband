"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { CreateBandMenu } from "@/components/CreateBandForm/CreateBandMenu";

export function BandsDropdown() {
  const bands = useQuery(api.bands.getUserBands);

  if (bands === undefined) {
    return (<div className="text-muted-foreground p-2 text-sm">Loading...</div>)
  }

  return (
    <>
      {bands.length === 0 && (
        <div className="text-muted-foreground p-2 text-sm">No bands found</div>
      )}
      {bands.map((band) => (
        <DropdownMenuItem key={band._id} asChild>
          <Link href={`/bands/${band._id}`} className="w-full cursor-pointer">
            {band.name}
          </Link>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <CreateBandMenu />
    </>
  );
}
