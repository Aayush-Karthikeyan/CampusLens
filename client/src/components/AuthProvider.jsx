import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../lib/authContext";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../lib/api";

// Holds the signed-in user for the whole app. The token itself lives in an
// httpOnly cookie the browser sends automatically, so there is nothing to store
// here — on load we simply ask the server who we are.
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // a 401 here just means "not signed in" — not an error worth surfacing
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setUser(await loginRequest(email, password));
  }, []);

  const signUp = useCallback(async (email, username, password) => {
    setUser(await registerRequest(email, username, password));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // clear locally even if the request fails, so the UI can't get stuck
      // looking signed in when it isn't
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, checking, signIn, signUp, signOut }),
    [user, checking, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
