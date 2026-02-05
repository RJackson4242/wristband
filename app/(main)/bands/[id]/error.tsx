"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConvexError } from "convex/values"; // 1. Import ConvexError

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const msg =
      error instanceof ConvexError
        ? (error.data as string)
        : "Unexpected error";
    toast.error("Load failed", { description: msg });
    router.push("/bands");
  }, [error, router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-8 text-muted-foreground">
      Unable to fetch band info. Redirecting...
    </div>
  );
}
