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
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 w-full space-y-12">
      <section>
        <div className="flex items-center justify-between pb-6 border-b mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Upcoming Events
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your upcoming events.
            </p>
          </div>
          <CreateEventDialog />
        </div>

        {futureEvents === undefined ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading schedule...
          </div>
        ) : futureEvents.length === 0 ? (
          <div className="py-16 text-center border rounded-lg bg-muted/20 border-dashed">
            <h3 className="text-lg font-medium">No upcoming events</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You have no events scheduled. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2  gap-6">
            {futureEvents.map((event) => (
              <EventCard key={event._id} {...event} showBandName={true} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="pb-4 border-b mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Past Events</h2>
        </div>

        {pastEvents === undefined ? (
          <div className="text-center text-muted-foreground">
            Loading history...
          </div>
        ) : pastEvents.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No past events found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
            {pastEvents.map((event) => (
              <EventCard
                key={event._id}
                {...event}
                showBandName={true}
                disableRSVP={true}
              />
            ))}
          </div>
        )}

        <div className="flex justify-center mt-8">
          {pastEvents && pastEvents.length >= pastEventsCount && (
            <Button variant="outline" onClick={handleLoadMore}>
              Load Older Events
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
