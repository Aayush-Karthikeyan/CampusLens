import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

// Wraps the app routes. While the initial /auth/me check is in flight we render
// nothing rather than redirecting — otherwise a signed-in user gets bounced to
// the login page for a frame on every hard refresh.
function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return <div className="min-h-dvh bg-night text-cream" />;
  }

  if (!user) {
    // remember where they were going so login can send them back
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default RequireAuth;
