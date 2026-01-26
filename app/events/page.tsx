import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { EventCard } from "./EventCard";

export default function EventsPage() {
  const upcoming = useQuery(api.events.userFutureEventCards);
  const past = useQuery(api.events.userPastEventCards, { limit: 10 });
  return (
    <div>
      <h1>Your Events</h1>
      <p>Manage your upcoming and past events.</p>
      <div>
        {upcoming === undefined && <p>Loading...</p>}
        {upcoming?.length === 0 && <p>No upcoming events.</p>}
        {upcoming?.map((event) => (
          <EventCard key={event._id} id={event._id} {...event} />
        ))}
      </div>
      <div>
        {past === undefined && <p>Loading...</p>}
        {past?.events?.length === 0 && <p>No past events.</p>}
        {past?.events.map((event) => (
          <EventCard key={event._id} id={event._id} {...event} />
        ))}
      </div>
    </div>
  );
}
