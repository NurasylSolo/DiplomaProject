import { useState, useEffect } from "react";

/**
 * Listen to a CSS media query and return whether it currently matches.
 * Only the hooks actually used by the app are exported — old breakpoint
 * shortcuts (useIsMobile/Tablet/Desktop, etc.) were removed because nothing
 * imported them. Add them back here if a real consumer appears.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
