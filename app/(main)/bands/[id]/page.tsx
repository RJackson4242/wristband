import { Id } from "@/convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BandPage({ params }: PageProps) {
  const { id } = await params;
  const bandId = id as Id<"bands">;
  if (!bandId) return <div>Loading...</div>;
  return;
}
