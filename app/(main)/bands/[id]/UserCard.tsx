import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { MoreHorizontal, ShieldAlert, User, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface UserCardProps {
  _id: Id<"memberships">;
  _creationTime: number;
  role: "admin" | "member" | "invited";
  userId: Id<"users">;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export function UserCard({
  _id,
  _creationTime,
  role,
  username,
  displayName,
  isAdmin,
}: UserCardProps) {
  const promote = useMutation(api.memberships.promote);
  const kick = useMutation(api.memberships.kick);

  const [isPending, setIsPending] = useState(false);

  const handlePromote = async () => {
    setIsPending(true);
    try {
      await promote({ id: _id });
      toast.success("Member promoted", {
        description: `${displayName} is now an Admin.`,
      });
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

  const handleKick = async () => {
    if (confirm("Are you sure you want to remove this person from the band?")) {
      setIsPending(true);
      try {
        await kick({ id: _id });
        toast.success("Member removed", {
          description: `${displayName} has been removed from the band.`,
        });
      } catch (error) {
        const msg =
          error instanceof ConvexError
            ? (error.data as string)
            : "Unexpected Error";
        toast.error("Action failed", { description: msg });
      } finally {
        setIsPending(false);
      }
    }
  };

  const isTargetAdmin = role === "admin";
  const showActions = isAdmin && !isTargetAdmin;

  return (
    <Card className="flex justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex flex-col">
          <div className="flex gap-2">
            <span className="font-medium">{displayName}</span>
            {isTargetAdmin && <Badge>Admin</Badge>}
          </div>
          <span className="text-muted-foreground">@{username}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-muted-foreground">
          Joined {new Date(_creationTime).toLocaleDateString()}
        </span>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8" disabled={isPending}>
                <MoreHorizontal className="w-4 h-4" />
                <span className="sr-only">User Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto">
              <DropdownMenuItem
                className="whitespace-nowrap pr-2"
                onClick={handlePromote}
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleKick}
                className="text-destructive focus:bg-destructive whitespace-nowrap pr-2"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
