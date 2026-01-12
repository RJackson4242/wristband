"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <>
      <Authenticated>
        You Are Signed In!
        <Content />
      </Authenticated>
      <Unauthenticated>
        Please Sign In!
      </Unauthenticated>
    </>
  );
}

function Content() {
  return <div>Welcome!</div>;
}