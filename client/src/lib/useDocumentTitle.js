import { useEffect } from "react";

// Per-route browser tab title; resets to the bare wordmark on unmount so the
// landing page never shows a stale tool name.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — CampusLens` : "CampusLens";
    return () => {
      document.title = "CampusLens";
    };
  }, [title]);
}
