// Shared UI primitives. Every page pulls these instead of re-typing the class
// strings, so the visual language can't drift between pages. Spacing/sizing
// stays at the call site via className; color + type treatment lives here.

// Ice-outline action button: the primary "do the thing" control app-wide.
export function ActionButton({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "border border-ice text-sm font-medium uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night disabled:cursor-not-allowed disabled:opacity-40 " +
        className
      }
    />
  );
}

// Text/date input. One style for the whole app (bg-cream/5 on border-cream/20).
export function Field({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={
        "border border-cream/20 bg-cream/5 text-cream placeholder:text-cream/40 focus:border-ice focus:outline-none disabled:opacity-40 " +
        className
      }
    />
  );
}

// Red uppercase tracked label that opens every section. `as` picks the tag
// (p / h2 / label) so semantics stay right while the look stays identical.
export function Kicker({ as: Tag = "p", className = "", ...props }) {
  return (
    <Tag
      {...props}
      className={
        "text-xs font-medium uppercase tracking-[0.2em] text-red " + className
      }
    />
  );
}
