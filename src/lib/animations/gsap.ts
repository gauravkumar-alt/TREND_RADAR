"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

let registered = false;
/** Register plugins exactly once (safe to call from every component). */
export function registerGSAP() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
  // Web fonts and late images change line heights; re-measure scroll positions once they settle.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
/** Coalesced ScrollTrigger.refresh() for layout changes that happen after scenes are built. */
export function scheduleRefresh(delay = 200) {
  if (typeof window === "undefined") return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), delay);
}

registerGSAP();

export { gsap, ScrollTrigger, SplitText, useGSAP };
