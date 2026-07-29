// Single source of truth for the social profiles. The landing corner bar renders
// the short forms, the footer renders icons for the same list, so the two can't
// drift apart. Lives outside the component files so fast refresh stays happy.
export const SOCIAL_LINKS = [
  {
    key: "linkedin",
    short: "(LI)",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/aayushkarthikeyan-pythu/",
  },
  {
    key: "github",
    short: "(GH)",
    label: "GitHub",
    href: "https://github.com/Aayush-Karthikeyan",
  },
  {
    key: "instagram",
    short: "(IG)",
    label: "Instagram",
    href: "https://www.instagram.com/aayushkarthikeyann/",
  },
];
