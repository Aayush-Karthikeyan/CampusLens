import { useCallback, useEffect, useState } from "react";
import { Kicker } from "../components/ui";

// In-app replacement for window.confirm, in the design language. Promise-based
// so call sites read like the native API:
//
//   const { confirm, confirmDialog } = useConfirm();
//   ...render {confirmDialog} once...
//   const ok = await confirm({ title, body, confirmLabel });
//
// Hook-only file (no component exports) so react-refresh stays happy.
export function useConfirm() {
  const [request, setRequest] = useState(null); // { title, body, confirmLabel, resolve }

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setRequest({ ...opts, resolve })),
    []
  );

  function close(result) {
    request?.resolve(result);
    setRequest(null);
  }

  useEffect(() => {
    if (!request) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        request.resolve(false);
        setRequest(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request]);

  const confirmDialog = request ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-night/80"
        onClick={() => close(false)}
        aria-hidden="true"
      />
      <div className="dialog-in relative w-full max-w-md border border-cream/15 bg-night p-6">
        <Kicker id="confirm-dialog-title">{request.title}</Kicker>
        <p className="mt-4 leading-relaxed text-cream/80">{request.body}</p>
        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            autoFocus
            onClick={() => close(false)}
            className="px-4 py-2.5 text-sm uppercase tracking-wide text-cream/50 transition-colors hover:text-cream"
          >
            Cancel
          </button>
          <button
            onClick={() => close(true)}
            className="border border-red px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-red transition-colors hover:bg-red hover:text-cream"
          >
            {request.confirmLabel || "Delete"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, confirmDialog };
}
