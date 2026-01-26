"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { BandCard } from "./BandCard";
import { CreateBandDialog } from "./CreateBandDialog";

export default function BandsPage() {
  const bands = useQuery(api.bands.getBandCards);
  return (
    <div>
      <h1>Your Bands</h1>
      <p>Manage your rosters and upcoming events.</p>
      <CreateBandDialog />
      <div>
        {bands === undefined && <p>Loading...</p>}
        {bands?.length === 0 && <p>You are not a member of any bands.</p>}
        {bands?.map((band) => (
          <BandCard key={band.id} {...band} />
        ))}
      </div>
    </div>
  );
}
