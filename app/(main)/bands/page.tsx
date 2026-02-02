"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { BandCard } from "./BandCard";
import { CreateBandDialog } from "./CreateBandDialog";

export default function BandsPage() {
  const bands = useQuery(api.bands.getBandCards);
  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-2xl font-bold">Your Bands</h1>
        <CreateBandDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bands === undefined && <p>Loading...</p>}
        {bands?.length === 0 && <p>You are not a member of any bands.</p>}
        {bands?.map((band) => (
          <BandCard key={band._id} {...band} />
        ))}
      </div>
    </div>
  );
}
