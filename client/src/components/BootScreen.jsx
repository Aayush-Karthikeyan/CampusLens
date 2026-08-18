import { useEffect, useState } from "react";
import { Kicker } from "./ui";

// The free-tier backend spins down after ~15 minutes of inactivity, so the first
// request after a quiet spell can take the better part of a minute to answer.
// Rendering a blank page for that long is indistinguishable from a broken
// deploy — which is exactly what someone following the live link would conclude.
// So name the wait instead of hiding it.
//
// Nothing shows for the first beat: a warm server answers in ~200ms, and a
// "waking up…" flash on a fast load would be its own kind of broken.
const SHOW_AFTER_MS = 1200;
const EXPLAIN_AFTER_MS = 6000;

function BootScreen() {
  const [stage, setStage] = useState(0); // 0 blank · 1 waiting · 2 explaining

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), SHOW_AFTER_MS),
      setTimeout(() => setStage(2), EXPLAIN_AFTER_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 text-cream"
    >
      {stage > 0 && (
        <div className="fade-up flex w-full max-w-sm flex-col items-center text-center">
          <Kicker>Starting up</Kicker>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
            Waking the server.
          </p>
          <div className="boot-sweep relative mt-6 h-px w-full overflow-hidden bg-cream/15" />
          {stage > 1 && (
            <p className="fade-up mt-6 text-sm leading-relaxed text-cream/50">
              The backend sleeps when nobody is using it — free hosting. This
              first load can take up to a minute. Everything after it is quick.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default BootScreen;
