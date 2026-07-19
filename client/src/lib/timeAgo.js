// Compact relative time for list metadata ("just now", "5m ago", "2d ago").
export function timeAgo(dateish) {
  const minutes = Math.round((Date.now() - new Date(dateish).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateish).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
