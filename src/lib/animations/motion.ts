"use client";
/**
 * Shared matchMedia conditions. Every scene builds its timeline inside
 * gsap.matchMedia with these keys, so:
 *   - desktop: pinned, scrubbed, cinematic
 *   - mobile:  simple vertical reveals, no pinning
 *   - reduce:  nothing animates; content is already in its final state
 */
export const MEDIA = {
  desktop: "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
} as const;

export type MediaContext = { desktop?: boolean; mobile?: boolean; reduce?: boolean };

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MEDIA.reduce).matches;
}

export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  expo: "expo.out",
  none: "none",
} as const;
