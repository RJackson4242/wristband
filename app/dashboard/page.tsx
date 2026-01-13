"use client";

import { Authenticated, Unauthenticated } from "convex/react";

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