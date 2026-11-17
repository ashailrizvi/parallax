/**
 * Shared product name, metadata and repository link.
 */
export const brand = {
  name: "Ace Studio",
  tagline: "Image, motion and sound",
  description:
    "A creative workspace for stills, motion, sound and shot planning. Built on Parallax.",
  /** Shown in the footer and the About dialog. */
  repoUrl: "https://github.com/ashailrizvi/parallax",
  creditName: "credit",
  creditNamePlural: "credits",
} as const;

export interface NavItem {
  href: string;
  label: string;
  /** Short line shown under the label in menus and on the home page. */
  blurb: string;
}

/** Top-level destinations. Feature teams add pages under these paths. */
export const primaryNav: NavItem[] = [
  { href: "/explore", label: "Explore", blurb: "What people are making right now" },
  { href: "/image", label: "Image", blurb: "Stills from text and references" },
  { href: "/video", label: "Video", blurb: "Shots from text, frames and references" },
  { href: "/audio", label: "Audio", blurb: "Voices and music" },
  { href: "/apps", label: "Apps", blurb: "One-click tools built on the models" },
  { href: "/library", label: "Library", blurb: "Everything you have made" },
];
