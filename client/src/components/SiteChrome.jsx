import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

const NAV_LINKS = [
  { to: "/chat", label: "Chat" },
  { to: "/quiz", label: "Quiz" },
  { to: "/study-plan", label: "Study Plan" },
  { to: "/#faq", label: "FAQ" },
];

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
    <a href={href} className="nav-link font-display text-2xl font-bold text-ice xl:text-4xl">
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
  // four spelled-out nav links don't fit beside the logo on a narrow screen —
  // below `md` they collapse into a full-screen menu
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        data-header
        className={
          (drop ? "header-drop " : "") +
          "site-header fixed inset-x-0 top-0 z-40 mix-blend-difference"
        }
      >
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center px-4 py-5 md:px-8 md:py-6 lg:px-10">
          <nav className="hidden items-center justify-start md:flex md:gap-6 lg:gap-10 xl:gap-16">
            {NAV_LINKS.map(({ to, label }) => (
              <FlipLink key={to} to={to} active={pathname === to}>
                {label}
              </FlipLink>
            ))}
          </nav>

          <button
            onClick={() => setMenuOpen(true)}
            className="justify-self-start text-ice md:hidden"
            aria-label="Open menu"
          >
            <FiMenu className="h-7 w-7" />
          </button>

          <Link
            ref={logoRef}
            to="/"
            aria-label="CampusLens home"
            className={"mx-2 text-ice md:mx-8" + (logoHidden ? " opacity-0" : "")}
          >
            <Logomark className="logo-spin h-10 w-10 md:h-14 md:w-14" />
          </Link>

          <Link
            to="/dashboard"
            aria-current={onDashboard ? "page" : undefined}
            className={
              "justify-self-end flex items-center gap-2 border border-ice px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors md:gap-3 md:px-6 md:py-3 md:text-lg " +
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

      {/* rendered outside the header so it escapes its mix-blend-difference */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-night md:hidden">
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute right-5 top-5 text-cream/70 transition-colors hover:text-cream"
            aria-label="Close menu"
          >
            <FiX className="h-7 w-7" />
          </button>

          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={
                "font-display text-4xl font-semibold uppercase tracking-tight transition-colors " +
                (pathname === to ? "text-cream" : "text-ice")
              }
            >
              {label}
            </Link>
          ))}

          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="mt-4 flex items-center gap-3 border border-ice px-6 py-3 text-base font-semibold uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night"
          >
            <span>Dashboard</span>
            <ArrowGlyph className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}

export function SocialBar({ enter = false }) {
  return (
    // hidden on phones: side by side with the "Start studying" CTA these two
    // need ~394px and collide on a 390px screen. The footer carries the same
    // social links, so nothing is lost.
    <div
      data-corner
      className="corner-track fixed left-0 bottom-4 z-40 hidden mix-blend-difference md:block md:bottom-5"
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
