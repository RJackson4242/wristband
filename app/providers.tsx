"use client";

import ConvexClientProvider from "@/components/ConvexClientProvider";
import { api } from "@/convex/_generated/api";
import { ClerkProvider } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";

export function UserSync() {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const [stored, setStored] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !stored) {
      storeUser({})
        .then(() => setStored(true))
        .catch((err) => console.error("Failed to store user:", err));
    }
  }, [isAuthenticated, storeUser, stored]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClientProvider>
        <UserSync />
        {children}
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
