import { Calendar, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import Link from "next/link";

interface BandCardProps {
  id: string;
  name: string;
  memberCount: number;
  upcomingEventsCount: number;
  isAdmin: boolean;
}

export function BandCard({
  id,
  name,
  memberCount,
  upcomingEventsCount,
  isAdmin,
}: BandCardProps) {
  return (
    <Link href={`/bands/${id}`}>
      <Card>
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          {isAdmin && <Badge>Admin</Badge>}
        </CardHeader>
        <CardContent>
          <div>
            <Users /> {memberCount} <span>Members</span>
          </div>
          <div>
            <Calendar />
            {upcomingEventsCount} <span>Upcoming Events</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
