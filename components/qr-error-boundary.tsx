"use client";

import { Component, type ReactNode } from "react";

type Props = {
  /** Changing this clears a previous failure and retries the render. */
  resetKey: string;
  fallback: ReactNode;
  children: ReactNode;
};

type State = { failedKey: string | null };

/**
 * The QR encoder throws when a payload simply will not fit in a QR code.
 * We validate lengths up front, but this keeps a stray edge case from taking
 * the whole page down with it.
 */
export class QrErrorBoundary extends Component<Props, State> {
  state: State = { failedKey: null };

  componentDidCatch() {
    this.setState({ failedKey: this.props.resetKey });
  }

  render() {
    if (this.state.failedKey !== null && this.state.failedKey === this.props.resetKey) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
