"use client";
import { Fragment, useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { statementMobile, statementScene, topicRevealMobile, topicRevealScene } from "@/lib/animations/presets";

/** "THE INTERNET DOESN'T TREND ONE VIDEO AT A TIME." → "IT TRENDS IN CONVERSATIONS." */
export function StatementSection() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.desktop, () => {
        if (ref.current) statementScene(ref.current);
      });
      mm.add(MEDIA.mobile, () => {
        if (ref.current) statementMobile(ref.current);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  const words = "THE INTERNET DOESN'T TREND ONE VIDEO AT A TIME.".split(" ");
  return (
    <section id="story" ref={ref} className="relative flex min-h-[calc(100svh-3.5rem)] items-center overflow-hidden border-b border-line" aria-label="Why patterns matter">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-4 py-24 md:px-8">
        <p data-s1 data-m-reveal className="relative display-xl text-[clamp(40px,8vw,140px)]">
          {words.map((w, i) => (
            <Fragment key={i}>
              <span className="inline-block">{w}</span>{" "}
            </Fragment>
          ))}
          <span data-s1-strike className="absolute left-0 top-1/2 hidden h-[0.08em] w-full origin-left scale-x-0 bg-signal min-[900px]:block" aria-hidden />
        </p>
        <p data-s2 data-m-reveal className="display-xl text-[clamp(40px,8vw,140px)] text-signal">
          IT TRENDS IN CONVERSATIONS.
        </p>
        <p data-s2-note data-m-reveal className="max-w-xl font-serif text-xl text-fg-2 md:text-2xl">
          One video is an anecdote. Five creators covering the same thing in the same week is a signal. Keep scrolling: first the videos, then the pattern.
        </p>
      </div>
    </section>
  );
}

/** "BUT THE VIDEO ISN'T THE STORY." → "THE PATTERN IS." */
export function TopicReveal() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.desktop, () => {
        if (ref.current) topicRevealScene(ref.current);
      });
      mm.add(MEDIA.mobile, () => {
        if (ref.current) topicRevealMobile(ref.current);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className="relative flex min-h-[calc(100svh-3.5rem)] items-center justify-center overflow-hidden border-b border-line" aria-label="The pattern">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-8 px-4 py-24 text-center md:px-8">
        <p data-tr1 data-m-reveal className="display-xl overflow-hidden text-[clamp(32px,6vw,104px)] text-fg-2">
          <span className="inline-block">BUT THE VIDEO</span> <span className="inline-block">ISN&apos;T THE STORY.</span>
        </p>
        <p data-tr2 data-m-reveal className="display-xl text-[clamp(56px,13vw,232px)] text-signal">
          THE PATTERN IS.
        </p>
        <span data-tr-rule className="h-px w-40 origin-center bg-signal" aria-hidden />
      </div>
    </section>
  );
}
