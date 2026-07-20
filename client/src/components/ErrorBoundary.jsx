import { Component } from "react";
import { ActionButton } from "./ui";

// React error boundaries must be class components. This catches render-time
// throws anywhere below it — a malformed API payload reaching a .map, a bad
// markdown/KaTeX edge — so the app shows a recoverable screen instead of
// blanking to the empty night background with no way out.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("CampusLens render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-night px-6 text-center text-cream">
        <p className="font-display text-3xl text-red">( error )</p>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Something went sideways.
        </h1>
        <p className="mt-5 max-w-md text-cream/60">
          CampusLens hit an unexpected snag rendering this page. A reload usually
          clears it.
        </p>
        <ActionButton
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3"
        >
          Reload
        </ActionButton>
      </div>
    );
  }
}

export default ErrorBoundary;
