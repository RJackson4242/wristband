import { Calendar, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import Link from "next/link";

interface BandCardProps {
  _id: string;
  name: string;
  memberCount: number;
  upcomingEventsCount: number;
  isAdmin: boolean;
}

export function BandCard({
  _id,
  name,
  memberCount,
  upcomingEventsCount,
  isAdmin,
}: BandCardProps) {
  return (
    <Link href={`/bands/${_id}`}>
      <Card className="hover:shadow-md hover:cursor-pointer">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>{name}</CardTitle>
          {isAdmin && <Badge>Admin</Badge>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" /> {memberCount} <span>Members</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {upcomingEventsCount} <span>Upcoming Events</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
