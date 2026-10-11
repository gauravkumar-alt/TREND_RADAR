"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { pageEnter } from "@/lib/animations/presets";

/** Wraps each route (via app/template.tsx) so navigation gets a soft enter. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
      if (ref.current) pageEnter(ref.current);
    });
    return () => mm.revert();
  });
  return <div ref={ref}>{children}</div>;
}
