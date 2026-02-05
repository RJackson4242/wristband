"use client";

import { ConvexError } from "convex/values";
import React, { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AuthErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error as Error };
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      let msg = error.message;

      if (error instanceof ConvexError) {
        msg = error.data as string;
      }

      if (msg.includes("Can't get current user")) {
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return null;
      }

      throw error;
    }

    return this.props.children;
  }
}
