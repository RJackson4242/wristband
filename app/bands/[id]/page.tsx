import { Id } from "@/convex/_generated/dataModel";
import { PastEventsList } from "./PastEventsList";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BandPage({ params }: PageProps) {
  const { id } = await params;
  const bandId = id as Id<"bands">;
  if (!bandId) return <div>Loading...</div>;
  return <PastEventsList bandId={bandId} />;
}
