"use client";
/**
 * TREND//RADAR animation library.
 *
 * Components never hand-roll big timelines; they mark up their DOM with
 * data-attributes and call one of these builders from inside useGSAP +
 * gsap.matchMedia. Everything animates transform / opacity / clip-path only.
 * ScrollTriggers created here are owned by the calling gsap.context, so they
 * are killed automatically on unmount.
 */
import { gsap, ScrollTrigger } from "./gsap";
import { EASE } from "./motion";

const q = <T extends Element = HTMLElement>(root: Element, sel: string) => gsap.utils.toArray<T>(root.querySelectorAll(sel));

// ---------------------------------------------------------------------------
// HERO — type enters, metadata fades, signals appear, CTA last.
// ---------------------------------------------------------------------------
export function heroIntro(root: HTMLElement) {
  const tl = gsap.timeline({ defaults: { ease: EASE.expo } });
  tl.from(q(root, "[data-hero-line] > span"), { yPercent: 110, duration: 1.2, stagger: 0.08 })
    .from(q(root, "[data-hero-tagline]"), { y: 24, opacity: 0, duration: 0.9 }, "-=0.7")
    .from(q(root, "[data-hero-meta]"), { opacity: 0, y: 8, duration: 0.6, stagger: 0.05 }, "-=0.5")
    .from(q(root, "[data-signal-dot]"), { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.5, stagger: { each: 0.03, from: "random" } }, "-=0.6")
    .from(q(root, "[data-signal-label]"), { opacity: 0, duration: 0.6, stagger: 0.08 }, "-=0.3")
    .from(q(root, "[data-hero-cta]"), { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 }, "-=0.2");
  // Subtle grid drift: background-position only, very slow.
  const grid = root.querySelector("[data-hero-grid]");
  if (grid) gsap.to(grid, { backgroundPosition: "80px 80px", duration: 24, ease: EASE.none, repeat: -1 });
  return tl;
}

/** Slow radar sweep + gentle dot breathing. Only called when motion is allowed. */
export function radarAmbient(root: Element) {
  const sweep = root.querySelector("[data-radar-sweep]");
  if (sweep) gsap.to(sweep, { rotate: 360, transformOrigin: "50% 50%", duration: 9, ease: EASE.none, repeat: -1 });
  q(root, "[data-signal-dot]").forEach((dot, i) => {
    gsap.to(dot, { opacity: 0.35, duration: 1.6 + (i % 5) * 0.3, yoyo: true, repeat: -1, ease: "sine.inOut", delay: (i % 7) * 0.2 });
  });
}

// ---------------------------------------------------------------------------
// STATEMENT — "doesn't trend one video at a time" → "trends in conversations"
// ---------------------------------------------------------------------------
export function statementScene(section: HTMLElement) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: "top top", end: "+=180%", pin: true, scrub: 0.6 },
  });
  tl.from(q(section, "[data-s1] > span"), { opacity: 0.08, stagger: 0.12, duration: 1 })
    .to(q(section, "[data-s1-strike]"), { scaleX: 1, duration: 0.8, ease: EASE.inOut }, "+=0.2")
    .to(q(section, "[data-s1]"), { opacity: 0.18, yPercent: -30, duration: 1 }, "+=0.1")
    .fromTo(q(section, "[data-s2]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.4, ease: EASE.inOut }, "<0.2")
    .from(q(section, "[data-s2-note]"), { opacity: 0, y: 20, duration: 0.6 });
  return tl;
}

// ---------------------------------------------------------------------------
// LIVE VIDEO REEL — scroll controls the active video.
// ---------------------------------------------------------------------------
export function reelScene(container: HTMLElement, onActive?: (index: number) => void) {
  const stages = q(container, "[data-reel-stage]");
  const n = stages.length;
  if (n === 0) return null;
  // stage 0 visible; others parked
  stages.forEach((s, i) => {
    if (i === 0) return;
    gsap.set(s.querySelector("[data-reel-media]"), { clipPath: "inset(100% 0% 0% 0%)" });
    gsap.set(q(s, "[data-reel-text]"), { yPercent: 100, opacity: 0 });
    gsap.set(q(s, "[data-reel-meta]"), { opacity: 0, y: 12 });
  });
  const progress = container.querySelector("[data-reel-progress]");

  const tl = gsap.timeline({
    defaults: { ease: EASE.inOut },
    scrollTrigger: {
      trigger: container,
      start: "top top",
      end: () => `+=${(n - 1) * window.innerHeight * 0.9}`,
      pin: true,
      scrub: 0.8,
      snap: n > 1 ? { snapTo: "labels", duration: { min: 0.2, max: 0.6 }, ease: "power1.inOut", delay: 0.05 } : undefined,
      invalidateOnRefresh: true,
      onUpdate: (self) => onActive?.(Math.min(n - 1, Math.round(self.progress * (n - 1)))),
    },
  });
  tl.addLabel("v0");
  for (let i = 1; i < n; i++) {
    const prev = stages[i - 1];
    const next = stages[i];
    const at = `v${i - 1}+=0.05`;
    tl.to(prev.querySelector("[data-reel-img]"), { scale: 1.12, duration: 1 }, at)
      .to(prev.querySelector("[data-reel-media]"), { opacity: 0.25, duration: 1 }, at)
      .to(q(prev, "[data-reel-text]"), { yPercent: -100, opacity: 0, duration: 0.6, stagger: 0.05 }, at)
      .to(q(prev, "[data-reel-meta]"), { opacity: 0, duration: 0.4 }, at)
      .to(next.querySelector("[data-reel-media]"), { clipPath: "inset(0% 0% 0% 0%)", duration: 1 }, at)
      .fromTo(next.querySelector("[data-reel-img]"), { scale: 1.25 }, { scale: 1, duration: 1 }, at)
      .to(q(next, "[data-reel-text]"), { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.06 }, `${at}+=0.35`)
      .to(q(next, "[data-reel-meta]"), { opacity: 1, y: 0, duration: 0.5, stagger: 0.04 }, `${at}+=0.5`)
      .addLabel(`v${i}`);
  }
  if (progress) tl.fromTo(progress, { scaleX: 1 / n }, { scaleX: 1, ease: EASE.none, duration: tl.duration() }, 0);
  return tl;
}

// ---------------------------------------------------------------------------
// TOPIC REVEAL — "But the video isn't the story." → "The pattern is."
// ---------------------------------------------------------------------------
export function topicRevealScene(section: HTMLElement) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: "+=140%", pin: true, scrub: 0.6 } });
  tl.from(q(section, "[data-tr1] > span"), { yPercent: 100, opacity: 0, stagger: 0.08, duration: 0.8 })
    .to(q(section, "[data-tr1]"), { opacity: 0.15, scale: 0.92, duration: 0.8 }, "+=0.4")
    .from(q(section, "[data-tr2]"), { scale: 2.4, opacity: 0, duration: 1.1, ease: EASE.expo }, "<0.1")
    .from(q(section, "[data-tr-rule]"), { scaleX: 0, duration: 0.8 }, "-=0.4");
  return tl;
}

// ---------------------------------------------------------------------------
// TREND FORMATION — individual signals converge into one topic.
// Cards carry their scattered offset in --fx / --fy (px) and --fr (deg).
// ---------------------------------------------------------------------------
export function formationScene(section: HTMLElement, onStats?: () => void) {
  const cards = q(section, "[data-formation-card]");
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: "top top", end: "+=220%", pin: true, scrub: 0.8 },
  });
  cards.forEach((c) => {
    const fx = parseFloat(c.style.getPropertyValue("--fx")) || 0;
    const fy = parseFloat(c.style.getPropertyValue("--fy")) || 0;
    const fr = parseFloat(c.style.getPropertyValue("--fr")) || 0;
    gsap.set(c, { x: fx, y: fy, rotate: fr });
  });
  tl.from(cards, { opacity: 0, scale: 0.8, duration: 0.6, stagger: 0.06 })
    .from(q(section, "[data-formation-lines] line"), { opacity: 0, duration: 0.4 }, "<")
    .to(cards, { x: 0, y: 0, rotate: 0, scale: 0.35, opacity: 0, duration: 1.4, ease: EASE.inOut, stagger: 0.04 }, "+=0.3")
    .to(q(section, "[data-formation-lines]"), { opacity: 0, duration: 0.6 }, "<0.4")
    .fromTo(q(section, "[data-formation-topic]"), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: EASE.expo }, "-=0.6")
    .from(q(section, "[data-formation-stat]"), {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.12,
      onStart: () => onStats?.(),
    });
  return tl;
}

// ---------------------------------------------------------------------------
// MOMENTUM — the line grows with scroll, then the verdict lands.
// ---------------------------------------------------------------------------
export function momentumScene(section: HTMLElement) {
  const line = section.querySelector<SVGPathElement>("[data-momentum-line]");
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: "+=160%", pin: true, scrub: 0.6 } });
  tl.from(q(section, "[data-momentum-title] > span"), { yPercent: 100, opacity: 0, stagger: 0.08, duration: 0.6 });
  if (line) {
    const len = line.getTotalLength();
    gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(line, { strokeDashoffset: 0, duration: 2, ease: EASE.none });
    tl.from(q(section, "[data-momentum-area]"), { opacity: 0, duration: 1 }, "<0.6");
    tl.from(q(section, "[data-momentum-dot]"), { scale: 0, transformOrigin: "50% 50%", duration: 0.3, stagger: 0.08 }, "<");
  }
  tl.from(q(section, "[data-momentum-verdict]"), { scale: 1.6, opacity: 0, duration: 0.8, ease: EASE.expo })
    .from(q(section, "[data-momentum-note]"), { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 });
  return tl;
}

// ---------------------------------------------------------------------------
// Generic: pinned editorial scene where blocks step in one after another.
// ---------------------------------------------------------------------------
export function steppedScene(section: HTMLElement, selector = "[data-step]", length = "+=140%") {
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: length, pin: true, scrub: 0.6 } });
  q(section, selector).forEach((el, i) => {
    tl.from(el, { y: 40, opacity: 0, duration: 0.6 }, i === 0 ? 0 : ">-0.2");
  });
  return tl;
}

/** Fade/slide elements in as they enter the viewport (no pinning). Used on mobile and on denser pages. */
export function revealOnScroll(targets: Element[] | NodeListOf<Element>, opts: { y?: number; stagger?: number } = {}) {
  const els = gsap.utils.toArray<HTMLElement>(targets as Element[]);
  if (!els.length) return;
  gsap.set(els, { opacity: 0, y: opts.y ?? 32 });
  ScrollTrigger.batch(els, {
    start: "top 88%",
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: opts.stagger ?? 0.08, ease: EASE.out, overwrite: true }),
  });
}

/** Count a number up into an element's text. The final value is the real one; only the tween is visual. */
export function countUp(el: Element, to: number, format: (n: number) => string, duration = 1.2) {
  const proxy = { v: 0 };
  return gsap.to(proxy, {
    v: to,
    duration,
    ease: EASE.out,
    onUpdate: () => {
      el.textContent = format(proxy.v);
    },
    onComplete: () => {
      el.textContent = format(to);
    },
  });
}

/** Page enter: soft clip + fade. Used by PageTransition. */
export function pageEnter(el: HTMLElement) {
  return gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: EASE.out, clearProps: "transform" });
}
