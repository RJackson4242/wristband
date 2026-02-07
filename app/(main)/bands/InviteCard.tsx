import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Clock, Check, X } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";
import { ConvexError } from "convex/values";

interface InviteCardProps {
  _id: string;
  _creationTime: number;
  type: "incoming" | "outgoing";
  title: string;
  invitorName?: string;
  showButtons?: boolean;
}

export function InviteCard({
  _id,
  _creationTime,
  type,
  title,
  invitorName,
  showButtons = true,
}: InviteCardProps) {
  const acceptInvite = useMutation(api.memberships.accept);
  const declineInvite = useMutation(api.memberships.decline);

  const [isPending, setIsPending] = useState(false);

  const handleAction = async (action: "accept" | "decline" | "cancel") => {
    setIsPending(true);
    try {
      const inviteId = _id as Id<"memberships">;

      if (action === "accept") {
        await acceptInvite({ id: inviteId });
        toast.success("Invite accepted");
      } else {
        await declineInvite({ id: inviteId });
        toast.info(
          action === "decline" ? "Invite declined" : "Invite cancelled",
        );
      }
    } catch (error) {
      const msg =
        error instanceof ConvexError
          ? (error.data as string)
          : "Unexpected Error";
      toast.error("Action failed", { description: msg });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="flex flex-row justify-between">
        <CardTitle>{title}</CardTitle>
        {showButtons && (
          <div className="flex gap-2">
            {type === "incoming" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isPending}
                  onClick={() => handleAction("decline")}
                >
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAction("accept")}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isPending}
                onClick={() => handleAction("cancel")}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          <span>Invited by</span>
          {invitorName}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>Sent</span>
          {new Date(_creationTime).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
