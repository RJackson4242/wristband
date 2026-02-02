"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { EventCard } from "./EventCard";
import { CreateEventDialog } from "./CreateEventDialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function EventsPage() {
  const futureEvents = useQuery(api.events.getUserUpcomingEvents);

  const [pastEventsCount, setPastEventsCount] = useState(6);
  const pastEvents = useQuery(api.events.getUserPastEvents, {
    count: pastEventsCount,
  });
  const handleLoadMore = () => {
    setPastEventsCount((prev: number) => prev + 6);
  };

  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-2xl font-bold">Your Events</h1>
        <CreateEventDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {futureEvents === undefined && <p>Loading...</p>}
        {futureEvents?.length === 0 && <p>You have no upcoming events.</p>}
        {futureEvents?.map((event) => (
          <EventCard key={event._id} {...event} showBandName={true} />
        ))}
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Past Events</h2>

        {pastEvents === undefined ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading past events...
          </div>
        ) : pastEvents.events.length === 0 ? (
          <p className="text-muted-foreground">You have no past events.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.events.map((event) => (
              <EventCard
                key={event._id}
                {...event}
                showBandName={true}
                disableRSVP={true}
              />
            ))}
          </div>
        )}

        <div className="flex justify-center mt-6">
          {pastEvents && pastEvents.events.length >= pastEventsCount && (
            <Button variant="outline" onClick={handleLoadMore}>
              Load Older Events
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
