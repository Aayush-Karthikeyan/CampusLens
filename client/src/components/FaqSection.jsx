import { Logomark } from "./SiteChrome";

const faqs = [
  {
    q: "What is CampusLens?",
    a: "An AI study assistant built around your own course material. Upload your PDFs — lecture notes, slides, textbooks — then ask questions, generate quizzes, and get a study plan, all grounded in what your professor actually gave you.",
  },
  {
    q: "Where do the answers come from?",
    a: "Only from the documents you upload. Every answer cites the exact source it was pulled from, so you can open the page and verify it yourself.",
  },
  {
    q: "What if the answer isn't in my documents?",
    a: "It tells you. CampusLens doesn't fill gaps with guesses — if your material doesn't cover something, you'll know instead of getting a confident wrong answer.",
  },
  {
    q: "What can I upload?",
    a: "PDFs for now — lecture notes, slide decks, textbook chapters, past exams. Everything for a course lives together, so answers can draw on all of it at once.",
  },
  {
    q: "How do quizzes work?",
    a: "Pick a course or a document and CampusLens turns the material into practice questions in one click — built from your files, not a generic question bank.",
  },
  {
    q: "What does a study plan look like?",
    a: "Tell it what the exam covers and when it is. You get a day-by-day plan built around your actual documents — what to read, what to practice, in what order.",
  },
  {
    q: "Is it free?",
    a: "Yes — free for Schulich students while it's in beta.",
  },
  {
    q: "Who built this?",
    a: "A Schulich student who got tired of rereading 400 slides the night before an exam. Built solo, 2026.",
  },
];

function FaqSection() {
  return (
    <section id="faq" className="bg-cream text-night">
      <div className="grid grid-cols-1 gap-12 px-6 pt-40 pb-40 md:grid-cols-2 md:gap-0 md:px-0 md:pt-48">
        {/* sticky page title, rides along as the questions scroll */}
        <div className="md:pl-10">
          <h1 className="font-display text-8xl font-semibold leading-none tracking-tight md:sticky md:top-40 md:text-[10rem] lg:text-[12rem]">
            FAQ
          </h1>
        </div>

        {/* the glyph column sits on the container's midline, so the marks
            scroll straight underneath the header logo above them */}
        <div className="md:pr-16 lg:pr-24">
          {faqs.map((faq, i) => (
            <div
              key={faq.q}
              className="border-t border-night/25 py-14 first:border-t-0 first:pt-0 md:py-20 md:first:border-t md:first:pt-20"
            >
              <div className="flex flex-col gap-8 md:flex-row md:gap-10">
                <div className="flex shrink-0 flex-col items-center gap-1.5 self-start md:-translate-x-1/2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em]">
                    Question
                  </span>
                  <Logomark className="h-14 w-14 md:h-16 md:w-16" />
                  <span className="text-base font-medium">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <h2 className="text-balance font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-5xl lg:text-[3.4rem]">
                    {faq.q}
                  </h2>
                  <p className="mt-10 max-w-xl text-lg leading-relaxed text-night/75">
                    A. {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
