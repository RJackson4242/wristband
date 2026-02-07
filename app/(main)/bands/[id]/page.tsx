"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, LogOut, MoreHorizontal, Settings } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BandForm } from "../BandForm";
import { InviteDialog } from "./InviteDialog";
import { UserCard } from "./UserCard";
import { ConvexError } from "convex/values";
import { EventCard } from "../../events/EventCard";
import { CreateEventDialog } from "../../events/CreateEventDialog";
import { InviteCard } from "../InviteCard";

export default function BandPage() {
  const router = useRouter();
  const params = useParams();
  const bandId = params.id as Id<"bands">;

  const [isLeaving, setIsLeaving] = useState(false);

  const bandPageInfo = useQuery(
    api.bands.getBandPage,
    isLeaving ? "skip" : { bandId },
  );

  const futureEvents = useQuery(
    api.events.getBandFutureEvents,
    isLeaving ? "skip" : { bandId },
  );

  const [pastEventsCount, setPastEventsCount] = useState(6);
  const pastEvents = useQuery(
    api.events.getBandPastEvents,
    isLeaving ? "skip" : { bandId, count: pastEventsCount },
  );

  const handleLoadMore = () => {
    setPastEventsCount((prev: number) => prev + 6);
  };

  const leaveBand = useMutation(api.memberships.leave);
  const updateBand = useMutation(api.bands.update);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleLeave = async () => {
    if (confirm("Are you sure you want to leave the band?")) {
      setIsLeaving(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      try {
        await leaveBand({ id: bandId });
        toast.success("Band left");
        router.push("/bands");
      } catch (error) {
        setIsLeaving(false);
        const msg =
          error instanceof ConvexError
            ? (error.data as string)
            : "Unexpected error";
        toast.error("Action failed", { description: msg });
      }
    }
  };

  const handleUpdateName = async (name: string) => {
    try {
      await updateBand({
        id: bandId,
        name: name,
      });
      toast.success("Band updated");
      setIsEditOpen(false);
    } catch (error) {
      const msg =
        error instanceof ConvexError
          ? (error.data as string)
          : "Unexpected error";
      toast.error("Action failed", { description: msg });
    }
  };

  if (bandPageInfo === undefined) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Loading band details...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 w-full">
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between pb-6 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/bands">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {bandPageInfo.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {bandPageInfo.members.length}{" "}
                {bandPageInfo.members.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
                <span className="sr-only">Band Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {bandPageInfo.isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Change Name
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10"
                onClick={handleLeave}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Band
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Members</h2>
            {bandPageInfo.isAdmin && <InviteDialog bandId={bandId} />}
          </div>

          <div className="flex flex-col gap-3">
            {bandPageInfo.members.map((member) => (
              <UserCard
                key={member._id}
                _id={member._id}
                _creationTime={member._creationTime}
                role={member.role}
                userId={member.userId}
                username={member.username}
                displayName={member.displayName}
                isAdmin={bandPageInfo.isAdmin}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="pb-6 border-b mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Outgoing Invites
            </h2>
          </div>

          {bandPageInfo.invites.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No pending invites
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
              {bandPageInfo.invites.map((invite) => (
                <InviteCard
                  key={invite._id}
                  {...invite}
                  type="outgoing"
                  showButtons={bandPageInfo.isAdmin}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Upcoming Events</h2>
            <CreateEventDialog bandId={bandId} />
          </div>

          {futureEvents === undefined ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading events...
            </div>
          ) : futureEvents.length === 0 ? (
            <div className="py-12 text-center border rounded-lg bg-muted/20 text-muted-foreground border-dashed">
              No upcoming events scheduled.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {futureEvents.map((event) => (
                <EventCard
                  key={event._id}
                  {...event}
                  bandName={bandPageInfo.name}
                  showBandName={false}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Past Events</h2>

          {pastEvents === undefined ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : pastEvents.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">
              No past events found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
              {pastEvents.map((event) => (
                <EventCard
                  key={event._id}
                  {...event}
                  bandName={bandPageInfo.name}
                  showBandName={false}
                  disableRSVP={true}
                />
              ))}
            </div>
          )}

          {pastEvents && pastEvents.length >= pastEventsCount && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleLoadMore}>
                Load Older Events
              </Button>
            </div>
          )}
        </section>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Band Name</DialogTitle>
            <DialogDescription>
              Update the name of your band below.
            </DialogDescription>
          </DialogHeader>
          <BandForm
            defaultName={bandPageInfo.name}
            onSubmit={handleUpdateName}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
