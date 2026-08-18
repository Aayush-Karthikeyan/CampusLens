import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import BootScreen from "./BootScreen";

// Wraps the app routes. While the initial /auth/me check is in flight we render
// nothing rather than redirecting — otherwise a signed-in user gets bounced to
// the login page for a frame on every hard refresh.
function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  // /auth/me is the app's first request, so it is also the one that pays for a
  // cold backend. BootScreen stays invisible on a warm load and explains itself
  // on a slow one.
  if (checking) {
    return <BootScreen />;
  }

  if (!user) {
    // remember where they were going so login can send them back
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default RequireAuth;
