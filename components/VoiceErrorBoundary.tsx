"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: string | null };

export class VoiceErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: Error) {
    return { error: err?.message || "Voice UI hiccup" };
  }

  componentDidCatch(err: Error) {
    console.error("[VoiceErrorBoundary]", err);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-white/70">Voice reset itself after a glitch.</p>
            <button
              type="button"
              className="bp-stamp"
              onClick={() => this.setState({ error: null })}
            >
              Reload voice
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
