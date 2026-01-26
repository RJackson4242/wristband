"use client";

import { EventCard } from "@/app/events/EventCard";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { usePaginatedQuery } from "convex/react";

interface PastEventsListProps {
  bandId: Id<"bands">;
}

export function PastEventsList({ bandId }: PastEventsListProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.events.getPast,
    { bandId },
    { initialNumItems: 10 },
  );

  return (
    <div>
      <h3>Past Events</h3>

      <div>
        {results.map((event) => (
          <EventCard
            key={event._id.toString()}
            id={event._id}
            title={event.name}
            type={event.type}
            description={event.description || undefined}
            startTime={event.startTime}
            location={event.location || undefined}
            currentRsvp="pending"
            attendingCount={0}
            totalMembers={0}
            isAdmin={false}
          />
        ))}
      </div>

      <div className="flex justify-center pt-4">
        {status === "LoadingMore" ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : status === "CanLoadMore" ? (
          <Button variant="outline" onClick={() => loadMore(10)}>
            Load Older Events
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No more events.</p>
        )}
      </div>
    </div>
  );
}
