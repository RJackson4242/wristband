"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { BandCard } from "./BandCard";
import { CreateBandDialog } from "./CreateBandDialog";
import { InviteCard } from "./InviteCard";

export default function BandsPage() {
  const bands = useQuery(api.bands.getBandCards);
  const invites = useQuery(api.memberships.getUserInvites);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 w-full space-y-12">
      <section>
        <div className="flex items-center justify-between pb-6 border-b mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Bands</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the bands you are a member of.
            </p>
          </div>
          <CreateBandDialog />
        </div>

        {bands === undefined ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading your bands...
          </div>
        ) : bands.length === 0 ? (
          <div className="py-16 text-center border rounded-lg bg-muted/20 border-dashed">
            <h3 className="text-lg font-medium">No bands found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You are not a member of any bands yet. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bands.map((band) => (
              <BandCard key={band._id} {...band} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="pb-6 border-b mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Incoming Invites
          </h2>
        </div>

        {invites === undefined ? (
          <div className="text-center text-muted-foreground">
            Loading invitations...
          </div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No incoming invites
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
            {invites.map((invite) => (
              <InviteCard key={invite._id} {...invite} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
