import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { FaGithub, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Logomark } from "./SiteChrome";
import { SOCIAL_LINKS } from "../lib/socialLinks";

const footerLinks = [
  { label: "Chat", to: "/chat" },
  { label: "Quiz", to: "/quiz" },
  { label: "Study Plan", to: "/study-plan" },
  { label: "FAQ", to: "/#faq" },
];

// icons for the shared SOCIAL_LINKS list, keyed so the two stay in sync
const SOCIAL_ICONS = {
  github: FaGithub,
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
};

const legalLinks = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Use", to: "/terms" },
];

const footerTokenCount = 20;

function FooterFlipLink({ to, href = "#", children, className = "", ariaLabel }) {
  const inner = (
    <>
      <span className="nav-label">{children}</span>
      <span className="nav-label" aria-hidden="true">
        {children}
      </span>
    </>
  );

  const linkClass = "nav-link footer-flip " + className;

  if (to) {
    return (
      <Link to={to} className={linkClass} aria-label={ariaLabel}>
        {inner}
      </Link>
    );
  }

  // real off-site links open in a new tab; the placeholder "#" ones must not
  const external = href.startsWith("http");

  return (
    <a
      href={href}
      className={linkClass}
      aria-label={ariaLabel}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
    >
      {inner}
    </a>
  );
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 91.743 + salt * 17.291) * 10000;
  return value - Math.floor(value);
}

function FooterTokenLogo() {
  return (
    <div className="footer-token-face">
      <Logomark className="footer-token-mark" />
      <span className="footer-token-cl" aria-hidden="true">
        CL
      </span>
    </div>
  );
}

function FooterLogoField() {
  const fieldRef = useRef(null);
  const tokenRefs = useRef([]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Touch devices get the static layout: a drag-to-throw physics field that
    // fills the screen competes with scrolling on a phone (and costs battery on
    // a device that can least afford it). Same visual, no interaction.
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    let cleanupPhysics = () => {};
    let resizeTimer = 0;

    // Below md the static layout is a honeycomb, not a scatter: random
    // placement has no collision resolution, and on a ~375px screen eight
    // 84-104px tokens cannot avoid overlapping — which reads as a physics
    // pile frozen mid-crash, not a design. The link stack is bottom-anchored
    // and ~340px tall, so the honeycomb gets whatever band is left above it:
    // three rows on tall screens, two on typical phones, one on small ones,
    // none in landscape (where the links already need the whole footer).
    const HONEYCOMB_LAYOUTS = [
      { rows: [2, 3, 2], minSize: 54 },
      { rows: [2, 3], minSize: 48 },
      { rows: [3], minSize: 40 },
    ];
    // vertical row pitch as a fraction of token size: 1.08 gap * sqrt(3)/2
    const ROW_PITCH = 0.94;

    const hideTokensFrom = (start) => {
      for (let index = start; index < tokenRefs.current.length; index += 1) {
        const el = tokenRefs.current[index];
        if (el) el.style.display = "none";
      }
    };

    const placeHoneycombTokens = () => {
      const width = field.clientWidth;
      // the links div is the field's next sibling inside the footer;
      // everything above its top edge is free space the honeycomb may use
      const links = field.nextElementSibling;
      const linksTop = links
        ? links.getBoundingClientRect().top - field.getBoundingClientRect().top
        : field.clientHeight * 0.55;
      const band = linksTop - 28; // 16px top margin + 12px gap above the links

      const rowSpan = (rowCount) => 1 + (rowCount - 1) * ROW_PITCH;
      const layout = HONEYCOMB_LAYOUTS.find(
        ({ rows, minSize }) => band / rowSpan(rows.length) >= minSize
      );
      if (!layout) {
        hideTokensFrom(0);
        return;
      }

      const { rows } = layout;
      const size = Math.min(width * 0.21, 92, band / rowSpan(rows.length));
      const pitchX = size * 1.08;
      const pitchY = size * ROW_PITCH;
      const centerY = 16 + band / 2; // cluster centered in the free band

      let index = 0;
      rows.forEach((rowCount, rowIndex) => {
        const y = centerY + (rowIndex - (rows.length - 1) / 2) * pitchY;
        for (let col = 0; col < rowCount; col += 1) {
          const el = tokenRefs.current[index];
          index += 1;
          if (!el) continue;

          const x = width / 2 + (col - (rowCount - 1) / 2) * pitchX;
          el.style.display = "block";
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.setProperty("--token-size", `${size}px`);
          el.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
        }
      });

      hideTokensFrom(index);
    };

    const placeStaticTokens = () => {
      const width = field.clientWidth;
      if (width < 768) {
        placeHoneycombTokens();
        return;
      }

      const height = field.clientHeight;
      const count = 14;

      tokenRefs.current.forEach((el, index) => {
        if (!el) return;
        if (index >= count) {
          el.style.display = "none";
          return;
        }

        const size = 145 + seeded(index, 2) * 70;
        const x = width * (0.08 + seeded(index, 4) * 0.84);
        const y = height * (0.34 + seeded(index, 6) * 0.58);
        const angle = -0.9 + seeded(index, 8) * 1.8;

        el.style.display = "block";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.setProperty("--token-size", `${size}px`);
        el.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) rotate(${angle}rad)`;
      });
    };

    const setupPhysics = () => {
      const {
        Bodies,
        Body,
        Composite,
        Engine,
        Events,
        Mouse,
        MouseConstraint,
        Runner,
      } = Matter;

      const width = field.clientWidth;
      const height = field.clientHeight;
      const isMobile = width < 768;
      const count = isMobile ? 10 : 18;
      const baseSize = isMobile ? 82 : 138;
      const engine = Engine.create();
      const runner = Runner.create();
      const tokenBodies = [];

      engine.gravity.y = 1.08;

      const floor = Bodies.rectangle(width / 2, height + 62, width * 1.8, 120, {
        isStatic: true,
        friction: 0.9,
      });
      const leftWall = Bodies.rectangle(-70, height / 2, 120, height * 2, {
        isStatic: true,
      });
      const rightWall = Bodies.rectangle(width + 70, height / 2, 120, height * 2, {
        isStatic: true,
      });

      tokenRefs.current.forEach((el, index) => {
        if (!el) return;
        if (index >= count) {
          el.style.display = "none";
          return;
        }

        const size = baseSize + seeded(index, 3) * (isMobile ? 22 : 78);
        const x = width * (0.08 + seeded(index, 5) * 0.84);
        const y = -size * (0.4 + index * 0.2);
        const body = Bodies.rectangle(x, y, size * 0.82, size * 0.82, {
          angle: -1.1 + seeded(index, 7) * 2.2,
          chamfer: { radius: size * 0.08 },
          density: 0.0014,
          friction: 0.72,
          frictionAir: 0.018,
          restitution: 0.18,
        });

        el.style.display = "block";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.setProperty("--token-size", `${size}px`);

        tokenBodies.push({ body, el, size });
      });

      const mouse = Mouse.create(field);
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: 0.16,
          damping: 0.08,
          render: { visible: false },
        },
      });

      mouse.element.removeEventListener("wheel", mouse.mousewheel);
      mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

      Composite.add(engine.world, [
        floor,
        leftWall,
        rightWall,
        ...tokenBodies.map(({ body }) => body),
        mouseConstraint,
      ]);

      const syncTokens = () => {
        tokenBodies.forEach(({ body, el, size }) => {
          el.style.transform = `translate3d(${body.position.x - size / 2}px, ${
            body.position.y - size / 2
          }px, 0) rotate(${body.angle}rad)`;
        });
      };

      let pointerDown = false;
      const pointer = { x: 0, y: 0 };

      const updatePointer = (event) => {
        const rect = field.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      };

      const pushNearbyTokens = () => {
        if (mouseConstraint.body) return;

        const radius = isMobile ? 150 : 230;

        tokenBodies.forEach(({ body }) => {
          const dx = body.position.x - pointer.x;
          const dy = body.position.y - pointer.y;
          const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

          if (distance > radius) return;

          const strength = (1 - distance / radius) * 0.0028;
          Body.applyForce(body, body.position, {
            x: (dx / distance) * strength * body.mass,
            y: (dy / distance) * strength * body.mass,
          });
        });
      };

      const onPointerDown = (event) => {
        pointerDown = true;
        updatePointer(event);
      };

      const onPointerMove = (event) => {
        if (!pointerDown) return;
        updatePointer(event);
        pushNearbyTokens();
      };

      const onPointerUp = () => {
        pointerDown = false;
      };

      field.addEventListener("pointerdown", onPointerDown);
      field.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      Events.on(engine, "afterUpdate", syncTokens);
      Runner.run(runner, engine);
      syncTokens();

      return () => {
        field.removeEventListener("pointerdown", onPointerDown);
        field.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        Events.off(engine, "afterUpdate", syncTokens);
        Runner.stop(runner);
        Composite.clear(engine.world, false);
        Engine.clear(engine);
      };
    };

    if (reduceMotion || coarsePointer) {
      let lastStaticWidth = field.clientWidth;
      placeStaticTokens();

      const onStaticResize = () => {
        const width = field.clientWidth;
        // iOS fires resize when the URL bar collapses mid-scroll — a
        // height-only change; re-laying out on it makes the tokens teleport
        // under the reader's thumb
        if (width < 768 && width === lastStaticWidth) return;
        lastStaticWidth = width;
        placeStaticTokens();
      };

      window.addEventListener("resize", onStaticResize);
      return () => window.removeEventListener("resize", onStaticResize);
    }

    cleanupPhysics = setupPhysics();

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        cleanupPhysics();
        cleanupPhysics = setupPhysics();
      }, 180);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      cleanupPhysics();
    };
  }, []);

  return (
    <div
      ref={fieldRef}
      className="footer-physics absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: footerTokenCount }, (_, index) => (
        <div
          key={index}
          ref={(el) => {
            tokenRefs.current[index] = el;
          }}
          className="footer-logo-token"
        >
          <FooterTokenLogo />
        </div>
      ))}
    </div>
  );
}

function InteractiveFooter() {
  return (
    <footer className="footer-stage relative min-h-[75vh] overflow-hidden bg-black text-cream md:min-h-[110vh]">
      <FooterLogoField />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-8 px-6 pb-8 md:flex-row md:items-end md:justify-between md:px-10 md:pb-10">
        <div className="pointer-events-auto flex flex-col items-start gap-6">
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map(({ key, label, href }) => {
              const Icon = SOCIAL_ICONS[key];
              return (
                <FooterFlipLink
                  key={key}
                  href={href}
                  ariaLabel={label}
                  className="footer-icon-link text-cream"
                >
                  <Icon aria-hidden="true" />
                </FooterFlipLink>
              );
            })}
          </div>

          <nav className="flex flex-col items-start gap-4">
            {footerLinks.map(({ label, to }) => (
              <FooterFlipLink
                key={label}
                to={to}
                className="text-lg font-medium uppercase text-cream md:text-2xl"
              >
                {label}
              </FooterFlipLink>
            ))}
          </nav>
        </div>

        <div className="pointer-events-auto flex flex-col items-start gap-5 text-left md:items-end md:text-right">
          {legalLinks.map(({ label, to }) => (
            <FooterFlipLink
              key={label}
              to={to}
              className="text-base font-medium text-cream md:text-2xl"
            >
              {label}
            </FooterFlipLink>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default InteractiveFooter;
