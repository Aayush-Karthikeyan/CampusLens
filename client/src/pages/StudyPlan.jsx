import { useOutletContext } from "react-router-dom";

// Placeholder — reads the shared course/documents from CourseWorkspace so we can
// confirm the rail persists across tools. Real study-plan generation needs a
// backend route and comes later.
function StudyPlan() {
  const { activeCourse, documents } = useOutletContext();

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-red">Study Plan</p>
      <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">
        {activeCourse ? activeCourse.name : "Pick a course"}
      </h1>
      <p className="mt-6 max-w-md text-cream/60">
        {activeCourse
          ? `${documents.length} document${documents.length === 1 ? "" : "s"} ready. Study-plan generation is coming soon.`
          : "Choose a course from the rail to build a study plan from its material."}
      </p>
    </main>
  );
}

export default StudyPlan;
