export const personalStudio = process.env.NEXT_PUBLIC_ACE_STUDIO_MODE === "personal";

const accountRoutes = ["/pricing", "/enterprise", "/wallet", "/invite", "/developer", "/mcp"];

export function showStudioLink(href: string): boolean {
  if (!personalStudio) return true;
  const path = href.split(/[?#]/, 1)[0];
  return !accountRoutes.includes(path);
}
