"use client";

import ConvexClientProvider from "@/components/ConvexClientProvider";
import { api } from "@/convex/_generated/api";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const storeUser = useMutation(api.users.store);
  const [stored, setStored] = useState(false);

  useEffect(() => {
    // Only run if Clerk is loaded, user exists, and we haven't stored yet this session
    if (isLoaded && user && !stored) {
      storeUser({})
        .then(() => setStored(true))
        .catch((err) => console.error("Failed to store user:", err));
    }
  }, [isLoaded, user, storeUser, stored]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClientProvider>
        {/* UserSync is safe here because it's inside both providers */}
        <UserSync />
        {children}
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
