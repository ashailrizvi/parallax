import type { ReactNode } from "react";
import { personalStudio } from "@/config/studio-mode";
import type { NavId } from "@/content/site";
import { cn } from "@/ui";
import { CompactNav } from "./compact-nav";
import { FullNav } from "./full-nav";
import { PromoBanner } from "./promo-banner";
import { SiteFooter } from "./site-footer";

const demoStudios = new Set<NavId>(["video", "audio", "remix", "cinema", "shorts", "apps", "ads"]);

/**
 * The frame around every app page: the offer strip, the nav, then the page.
 *
 *   <AppShell active="image" fixed>...</AppShell>
 *   <AppShell active="pricing" nav="full" footer>...</AppShell>
 *
 * `active` lights a nav link. `fixed` pins the frame to the window height so the page can
 * manage its own scrolling (create pages, where the composer floats over a scrolling grid).
 * Without it the page scrolls as a whole.
 *
 * `nav` picks the bar: "compact" (the default, 36 pixels, on the studios) or "full" (the
 * taller bar with the big menus, on the home and marketing pages). `footer` adds the site
 * footer under the page; it has no effect with `fixed`.
 *
 * `className` can scope theme overrides to a single page and its chrome.
 */
export function AppShell({
  active,
  fixed,
  nav = "compact",
  footer,
  className,
  children,
}: {
  active?: NavId;
  fixed?: boolean;
  nav?: "compact" | "full";
  footer?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", fixed ? "h-dvh overflow-hidden" : "min-h-dvh", className)}>
      <PromoBanner />
      {nav === "full" ? <FullNav active={active} /> : <CompactNav active={active} />}
      {personalStudio && active && demoStudios.has(active) ? (
        <p className="shrink-0 border-b border-border-subtle px-4 pb-2 text-xs text-text-nav">
          Demo mode uses bundled samples.
        </p>
      ) : null}
      <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>
      {footer && !fixed ? <SiteFooter /> : null}
    </div>
  );
}
