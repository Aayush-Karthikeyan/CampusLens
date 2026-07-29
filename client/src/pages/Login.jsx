import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { SiteHeader } from "../components/SiteChrome";
import { ActionButton, Field, Kicker } from "../components/ui";
import { useAuth } from "../lib/useAuth";
import { useDocumentTitle } from "../lib/useDocumentTitle";

// One page for both modes — the fields differ by a single input, and a toggle
// keeps people from bouncing between two routes to find the right form.
function Login() {
  const { user, checking, signIn, signUp } = useAuth();
  const location = useLocation();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "signup";
  useDocumentTitle(isSignUp ? "Create account" : "Sign in");

  // send people back where they were headed before the redirect
  const from = location.state?.from || "/dashboard";
  if (!checking && user) return <Navigate to={from} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), username.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-night text-cream">
      <SiteHeader />

      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 pb-16 pt-32">
        <p className="fade-up font-display text-3xl text-red">
          ( {isSignUp ? "join" : "welcome back"} )
        </p>
        <h1 className="fade-up fade-up-1 mt-4 font-display text-5xl font-semibold tracking-tight">
          {isSignUp ? "Create your account." : "Sign in."}
        </h1>
        <p className="fade-up fade-up-2 mt-4 text-cream/60">
          {isSignUp
            ? "Your courses, uploads and chats stay yours."
            : "Pick up where you left off."}
        </p>

        <form onSubmit={handleSubmit} className="fade-up fade-up-3 mt-10 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <Kicker as="span">Email</Kicker>
            <Field
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.ca"
              className="px-4 py-3"
              required
            />
          </label>

          {isSignUp && (
            <label className="flex flex-col gap-2">
              <Kicker as="span">Name</Kicker>
              <Field
                type="text"
                autoComplete="nickname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Aayush"
                className="px-4 py-3"
                required
              />
            </label>
          )}

          <label className="flex flex-col gap-2">
            <Kicker as="span">Password</Kicker>
            <Field
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
              className="px-4 py-3"
              required
            />
          </label>

          {error && (
            <p className="border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
              {error}
            </p>
          )}

          <ActionButton type="submit" disabled={busy} className="mt-2 px-8 py-3">
            {busy
              ? isSignUp
                ? "Creating account…"
                : "Signing in…"
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </ActionButton>
        </form>

        <p className="mt-8 text-sm text-cream/50">
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? "signin" : "signup");
              setError(null);
            }}
            className="text-ice underline-offset-4 transition-opacity hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>

        <Link
          to="/"
          className="mt-3 text-sm text-cream/40 transition-colors hover:text-cream"
        >
          ← Back to home
        </Link>
      </main>
    </div>
  );
}

export default Login;
