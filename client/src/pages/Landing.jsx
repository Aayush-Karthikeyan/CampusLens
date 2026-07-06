import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowGlyph,
  Logomark,
  SiteHeader,
  SocialBar,
} from "../components/SiteChrome";
import FaqSection from "../components/FaqSection";
import InteractiveFooter from "../components/InteractiveFooter";
import chatIcon from "../assets/feature-icons/chat_icon.svg";
import citedIcon from "../assets/feature-icons/cited_icon.svg";
import quizIcon from "../assets/feature-icons/quiz_icon.svg";
import plansIcon from "../assets/feature-icons/plans_icon.svg";

const features = [
  {
    tag: "chat",
    icon: chatIcon,
    statement: "Ask your notes anything.",
    desc: "Ask questions and get answers pulled straight from your uploaded course material — no rereading 400 slides to find one definition.",
  },
  {
    tag: "cited",
    icon: citedIcon,
    statement: "Every answer shows its receipts.",
    desc: "Each response points back to the exact page and passage it came from — open the source and check it yourself.",
  },
  {
    tag: "quiz",
    icon: quizIcon,
    statement: "Test yourself before the exam does.",
    desc: "Turn any lecture or chapter into a set of practice questions in one click.",
  },
  {
    tag: "plans",
    icon: plansIcon,
    statement: "A plan built from your course, not a template.",
    desc: "Tell it what to cover and when the exam is — get a study plan built around your actual documents.",
  },
];

const brandLetters = "campuslens".split("");

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Landing() {
  const [intro, setIntro] = useState(() =>
    prefersReducedMotion() ? "done" : "hold"
  );
  const stageRef = useRef(null);
  const introMarkRef = useRef(null);
  const headerLogoRef = useRef(null);
  const location = useLocation();

  // router hash changes don't trigger native anchor scrolling — do it ourselves
  useEffect(() => {
    if (location.hash === "#faq") {
      document.getElementById("faq")?.scrollIntoView();
    }
  }, [location]);

  // kick the corner elements off the page when the footer scrolls into view
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        document.querySelectorAll("[data-corner]").forEach((el) => {
          el.classList.toggle("corner-out", entry.isIntersecting);
        });
        document
          .querySelector("[data-header]")
          ?.classList.toggle("header-out", entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const openTimer = setTimeout(() => {
      const mark = introMarkRef.current;
      const target = headerLogoRef.current;
      if (mark && target) {
        // header's resting position via offsets — getBoundingClientRect would
        // read the header-drop animation's translateY, offsets ignore transforms
        let x = 0;
        let y = 0;
        for (let el = target; el && el !== document.body; el = el.offsetParent) {
          x += el.offsetLeft;
          y += el.offsetTop;
        }
        const from = mark.getBoundingClientRect();
        const dx = x + target.offsetWidth / 2 - (from.left + from.width / 2);
        const dy = y + target.offsetHeight / 2 - (from.top + from.height / 2);
        mark.style.transform = `translate(${dx}px, ${dy}px) scale(${
          target.offsetWidth / from.width
        })`;
      }
      setIntro("open");
    }, 900);
    const doneTimer = setTimeout(() => setIntro("done"), 2100);
    return () => {
      clearTimeout(openTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = stageRef.current;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const runway = stage.offsetHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, -rect.top / runway));
        stage.style.setProperty("--story-p", p);
        // which chapter band the scroll sits in: blank beat until .3, then 01-04
        const idx = p < 0.3 ? -1 : Math.min(3, Math.floor((p - 0.3) / 0.175));
        stage.querySelectorAll(".chapter").forEach((el, i) => {
          el.classList.toggle("chapter-active", i === idx);
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {intro !== "done" && (
        <div
          className={"intro-overlay" + (intro === "open" ? " intro-open" : "")}
          aria-hidden="true"
        >
          <div className="intro-mark" ref={introMarkRef}>
            <Logomark className="h-full w-full" />
          </div>
          <p className="intro-wordmark text-sm font-medium uppercase tracking-widest">
            campuslens
          </p>
        </div>
      )}

      <SiteHeader drop logoHidden={intro !== "done"} logoRef={headerLogoRef} />
      <SocialBar enter />

      <div
        data-corner
        className="corner-track fixed bottom-4 right-4 z-40 mix-blend-difference md:bottom-5 md:right-5"
      >
        <Link
          to="/dashboard"
          className="corner-enter corner-enter-2 flex items-center gap-3 border border-ice px-5 py-3 text-lg font-semibold uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night md:px-6 md:py-3.5 md:text-xl"
        >
          <span>Start studying</span>
          <span className="mint-arrows" aria-hidden="true">
            <ArrowGlyph className="mint-arrow h-4 w-4" />
            <ArrowGlyph className="mint-arrow h-4 w-4" />
            <ArrowGlyph className="mint-arrow h-4 w-4" />
          </span>
        </Link>
      </div>

      <div className="hero-stage" ref={stageRef}>
        <div className="hero-sticky">
          <div className="hero-photo-layer" aria-hidden="true" />
          <div className="hero-content relative grid h-full w-full grid-cols-1 content-center items-center gap-10 px-10 md:grid-cols-[1fr_auto_1fr] md:gap-8 md:px-16 lg:px-24">
            <p className="hero-enter hero-enter-1 text-center text-base font-semibold leading-relaxed text-cream md:text-right md:text-xl lg:text-2xl">
              Notes
              <br />
              Slides
              <br />
              Textbooks
            </p>

            <h1 className="hero-enter hero-enter-2 hero-wordmark text-center font-display text-7xl font-semibold leading-none tracking-tight md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[11rem]">
              <Link to="/" aria-label="campuslens">
                <span className="sr-only">campuslens</span>
                <span className="hero-wordmark-text" aria-hidden="true">
                  {brandLetters.map((letter, index) => (
                    <span
                      key={index}
                      className="hero-wordmark-letter"
                      style={{ "--letter-i": index }}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
              </Link>
            </h1>

            <p className="hero-enter hero-enter-3 text-center text-base font-semibold leading-relaxed text-cream md:text-left md:text-xl lg:text-2xl">
              Grounded
              <br />
              Cited
              <br />
              Always
            </p>
          </div>

          {features.map((feature, i) => (
            <div key={feature.tag} className="chapter text-night">
              <div className="flex h-full flex-col justify-between px-10 pt-28 pb-28 md:px-16 md:pt-32 md:pb-32 lg:pt-36">
                <div className="flex items-start justify-between">
                  <div>
                    {/* red pictogram slot — aperture mark stands in until the real set arrives */}
                    <img
                      src={feature.icon}
                      alt=""
                      aria-hidden="true"
                      className="h-9 w-9 object-contain md:h-11 md:w-11"
                    />
                    <p className="mt-5 text-xs uppercase tracking-[0.2em] text-night">
                      What it does
                    </p>
                    <p className="mt-3 font-display text-4xl md:text-5xl">( {feature.tag} )</p>
                  </div>
                  <span className="font-display text-8xl font-extrabold leading-none md:text-[11rem]">
                    0{i + 1}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-10">
                  <h3 className="max-w-xs font-display text-4xl font-extrabold leading-[0.98] tracking-tight md:max-w-[28vw] md:text-5xl lg:text-6xl">
                    {feature.statement}
                  </h3>
                  <p className="max-w-[28vw] text-lg leading-relaxed text-night/70 md:max-w-sm">
                    {feature.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FaqSection />

      <InteractiveFooter />
    </div>
  );
}

export default Landing;
