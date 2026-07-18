import { Link, useLocation } from "react-router-dom";

export function Logomark({ className }) {
  return (
    <svg viewBox="0 0 680 680" className={className} aria-hidden="true">
      <g transform="translate(340,340)">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <path
            key={deg}
            d="M 255.2,-135.7 L 255.2,135.7 L 74.1,10.4 L 50.0,-55.6 Z"
            fill="currentColor"
            transform={`rotate(${deg})`}
          />
        ))}
      </g>
    </svg>
  );
}

export function ArrowGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M7 4 L18 12 L7 20 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FlipLink({ to, active = false, children }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={
        "nav-link text-base uppercase tracking-widest md:text-lg " +
        (active ? "text-cream" : "text-ice")
      }
    >
      <span className="nav-label">{children}</span>
      <span className="nav-label" aria-hidden="true">
        {children}
      </span>
    </Link>
  );
}

function FlipSocial({ href, children }) {
  return (
    <a href={href} className="nav-link font-display text-3xl font-bold text-ice md:text-4xl">
      <span className="nav-label">{children}</span>
      <span className="nav-label" aria-hidden="true">
        {children}
      </span>
    </a>
  );
}

export function SiteHeader({ drop = false, logoHidden = false, logoRef = null }) {
  // Landing keeps the marketing header; inside the app the nav marks the
  // active tool and the CTA points home to the Dashboard instead of "Open app".
  const { pathname } = useLocation();
  const inApp = pathname !== "/";
  const onDashboard = pathname === "/dashboard";

  return (
    <header
      data-header
      className={
        (drop ? "header-drop " : "") +
        "site-header fixed inset-x-0 top-0 z-40 mix-blend-difference"
      }
    >
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center px-6 py-6 md:px-8 lg:px-10">
        <nav className="flex items-center justify-start gap-16">
          <FlipLink to="/chat" active={pathname === "/chat"}>
            Chat
          </FlipLink>
          <FlipLink to="/quiz" active={pathname === "/quiz"}>
            Quiz
          </FlipLink>
          <FlipLink to="/study-plan" active={pathname === "/study-plan"}>
            Study Plan
          </FlipLink>
          <FlipLink to="/#faq">FAQ</FlipLink>
        </nav>

        <Link
          ref={logoRef}
          to="/"
          aria-label="CampusLens home"
          className={"mx-8 text-ice" + (logoHidden ? " opacity-0" : "")}
        >
          <Logomark className="logo-spin h-12 w-12 md:h-14 md:w-14" />
        </Link>

        <Link
          to="/dashboard"
          aria-current={onDashboard ? "page" : undefined}
          className={
            "justify-self-end flex items-center gap-3 border border-ice px-5 py-2.5 text-base font-semibold uppercase tracking-wide transition-colors md:px-6 md:py-3 md:text-lg " +
            (onDashboard
              ? "bg-ice text-night"
              : "text-ice hover:bg-ice hover:text-night")
          }
        >
          <span>{inApp ? "Dashboard" : "Open app"}</span>
          <ArrowGlyph className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

export function SocialBar({ enter = false }) {
  return (
    <div
      data-corner
      className="corner-track fixed left-0 bottom-4 z-40 mix-blend-difference md:bottom-5"
    >
      <div className={(enter ? "corner-enter corner-enter-1 " : "") + "flex items-center gap-8 px-4 md:px-5"}>
        <FlipSocial href="#">(LI)</FlipSocial>
        <FlipSocial href="#">(GH)</FlipSocial>
        <FlipSocial href="#">(IG)</FlipSocial>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-cream/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-8 pb-32 text-sm text-cream/50">
        <span className="font-medium uppercase tracking-widest text-cream">campuslens</span>
        <span>Built at Schulich · 2026</span>
      </div>
    </footer>
  );
}
