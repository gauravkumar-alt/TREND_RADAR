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

/**
 * Play on first entry and never reverse. Used instead of `once: true`, which
 * kills the trigger while ScrollTrigger may still be iterating its list
 * (crashes when an element is already in view at creation time).
 */
export const PLAY_ONCE = "play none none none";

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

/**
 * Page enter: opacity only. A transform on this wrapper would become the
 * containing block for every pinned (position: fixed) scene inside the page.
 */
export function pageEnter(el: HTMLElement) {
  return gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: EASE.out, clearProps: "opacity" });
}

// ===========================================================================
// Editorial scenes for /trends and /brief
// ===========================================================================
import { SplitText, scheduleRefresh } from "./gsap";
import { compact as fmtCompact } from "@/lib/format";
import { formatDurationWords } from "@/lib/youtube/duration";

/** Formats used by [data-count] elements; the final text is always the real value. */
const COUNT_FORMATS: Record<string, (n: number) => string> = {
  int: (n) => String(Math.round(n)),
  compact: (n) => fmtCompact(n),
  pct1: (n) => `${(n * 100).toFixed(1)}%`,
  duration: (n) => formatDurationWords(Math.round(n)),
};

/** Words (or chars) rise out of a mask. */
export function splitRise(el: Element | null, opts: { type?: "words" | "chars"; stagger?: number; duration?: number } = {}) {
  const tl = gsap.timeline();
  if (!el) return tl;
  const chars = opts.type === "chars";
  const split = SplitText.create(el, { type: chars ? "words,chars" : "words", mask: chars ? "chars" : "words" });
  tl.from(chars ? split.chars : split.words, { yPercent: 115, duration: opts.duration ?? 0.9, stagger: opts.stagger ?? (chars ? 0.025 : 0.05), ease: EASE.expo });
  // Masks clip descenders on tight display type; once the words have landed, restore the plain text.
  tl.eventCallback("onComplete", () => {
    split.revert();
    scheduleRefresh();
  });
  return tl;
}

/** Count every [data-count] inside `root` from 0 to its real value. */
export function countIn(root: Element, duration = 1.2) {
  const tl = gsap.timeline();
  root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const to = Number(el.dataset.count);
    const fmt = COUNT_FORMATS[el.dataset.fmt ?? "int"] ?? COUNT_FORMATS.int;
    if (Number.isFinite(to)) tl.add(countUp(el, to, fmt, duration), 0);
  });
  return tl;
}

/** Grow [data-bar] fills from zero, draw [data-gauge] arcs and momentum lines. */
export function growBars(root: Element, duration = 1) {
  const tl = gsap.timeline();
  const bars = root.querySelectorAll("[data-bar]");
  if (bars.length) tl.from(bars, { scaleX: 0, transformOrigin: "0% 50%", duration, stagger: 0.06, ease: EASE.expo }, 0);
  const arcs = root.querySelectorAll("[data-gauge]");
  if (arcs.length) tl.from(arcs, { drawSVG: "0%", duration: duration * 1.3, ease: EASE.expo }, 0);
  const lines = root.querySelectorAll("[data-momentum-line]");
  if (lines.length) tl.from(lines, { drawSVG: "0%", duration: duration * 1.6, ease: EASE.inOut }, 0.1);
  return tl;
}

/** /trends header: title letters rise, the rest settles in. */
export function trendsIntro(root: HTMLElement) {
  const tl = gsap.timeline({ defaults: { ease: EASE.expo } });
  tl.from(root.querySelectorAll("[data-intro-kicker]"), { y: 12, opacity: 0, duration: 0.6 })
    .add(splitRise(root.querySelector("[data-intro-title]"), { type: "chars", stagger: 0.03, duration: 1.1 }), "<0.1")
    .add(splitRise(root.querySelector("[data-intro-sub]"), { stagger: 0.04 }), "-=0.7")
    .from(root.querySelectorAll("[data-intro-fade]"), { y: 14, opacity: 0, duration: 0.7, stagger: 0.04 }, "-=0.5");
  return tl;
}

/**
 * One topic: the giant rank drifts against the scroll; on first entry the
 * title rises word by word, numbers count up, the score ring draws and the
 * "what to make" line wipes in.
 */
export function topicScene(article: HTMLElement) {
  const drift = article.querySelector("[data-rank-drift]");
  if (drift) {
    gsap.fromTo(drift, { yPercent: 20 }, { yPercent: -20, ease: EASE.none, scrollTrigger: { trigger: article, start: "top bottom", end: "bottom top", scrub: true } });
  }
  const head = article.querySelector("[data-topic-head]") ?? article;
  const tl = gsap.timeline({ scrollTrigger: { trigger: article, start: "top 80%", toggleActions: PLAY_ONCE }, defaults: { ease: EASE.expo } });
  tl.from(article.querySelector("[data-rank]"), { yPercent: 100, opacity: 0, duration: 1 })
    .add(growBars(head, 1.3), "<")
    .add(countIn(head, 1.3), "<")
    .from(article.querySelectorAll("[data-topic-badge]"), { y: 10, opacity: 0, duration: 0.5, stagger: 0.05 }, "<0.1")
    .add(splitRise(article.querySelector("[data-topic-title]"), { stagger: 0.045 }), "<0.05")
    .from(article.querySelector("[data-topic-summary]"), { y: 24, opacity: 0, duration: 0.8 }, "<0.3")
    .from(article.querySelectorAll("[data-topic-metric]"), { y: 20, opacity: 0, duration: 0.6, stagger: 0.05 }, "<0.1")
    .from(article.querySelector("[data-topic-toggle]"), { opacity: 0, y: 10, duration: 0.5 }, "-=0.3");
  return tl;
}

/** Details panel opening: blocks stagger up, bars grow, chart draws, thumbnails wipe in. */
export function detailsOpen(panel: HTMLElement) {
  const tl = gsap.timeline({ defaults: { ease: EASE.out } });
  tl.fromTo(panel, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.55, clearProps: "height" })
    .from(panel.querySelectorAll("[data-detail]"), { y: 30, opacity: 0, duration: 0.6, stagger: 0.07 }, "<0.1")
    .add(growBars(panel, 1), "<0.2")
    .from(panel.querySelectorAll("[data-evidence]"), { clipPath: "inset(0 0 100% 0)", duration: 0.8, stagger: 0.08, ease: EASE.inOut }, "<0.1");
  return tl;
}

/** Side rail: highlight the topic in view and fill its line as you read through it. */
export function topicRail(rail: HTMLElement, articles: HTMLElement[]) {
  articles.forEach((a) => {
    const item = rail.querySelector<HTMLElement>(`[data-rail="${a.id}"]`);
    if (!item) return;
    const fill = item.querySelector("[data-rail-fill]");
    ScrollTrigger.create({
      trigger: a,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => item.toggleAttribute("data-active", self.isActive),
      onUpdate: (self) => {
        if (fill) gsap.set(fill, { scaleY: self.progress });
      },
    });
  });
  gsap.from(rail.children, { x: -24, opacity: 0, duration: 0.6, stagger: 0.07, ease: EASE.out, delay: 0.8 });
}

/** Sunday Brief masthead. */
export function briefIntro(root: HTMLElement) {
  const tl = gsap.timeline({ defaults: { ease: EASE.expo } });
  tl.from(root.querySelectorAll("[data-mast-rule]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 1, stagger: 0.1 })
    .add(splitRise(root.querySelector("[data-mast-title]"), { type: "chars", stagger: 0.035, duration: 1.1 }), "<0.1")
    .from(root.querySelectorAll("[data-mast-fade]"), { y: 16, opacity: 0, duration: 0.7, stagger: 0.07 }, "-=0.7")
    .add(countIn(root, 1.2), "<")
    .add(splitRise(root.querySelector("[data-mast-headline]"), { stagger: 0.04 }), "-=0.6");
  return tl;
}

/** Big numbers that drift against the scroll. */
export function parallaxNumbers(root: Element, selector = "[data-parallax]") {
  root.querySelectorAll(selector).forEach((el) => {
    gsap.fromTo(el, { yPercent: 30 }, { yPercent: -30, ease: EASE.none, scrollTrigger: { trigger: el.closest("article,section") ?? el, start: "top bottom", end: "bottom top", scrub: true } });
  });
}

/** Headings that rise word by word when scrolled into view. */
export function riseOnScroll(root: Element, selector = "[data-rise]") {
  root.querySelectorAll(selector).forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: "top 85%", toggleActions: PLAY_ONCE, animation: splitRise(el, { stagger: 0.04 }) });
  });
}

/** MONDAY MORNING finale: pinned; the title grows into place and each line of the plan lands in turn. */
export function mondayScene(section: HTMLElement) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: "+=160%", pin: true, scrub: 0.6 } });
  tl.from(section.querySelector("[data-monday-title]"), { scale: 0.5, opacity: 0.15, transformOrigin: "0% 50%", duration: 1 })
    .from(section.querySelector("[data-monday-rule]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.6 }, "-=0.3");
  section.querySelectorAll("[data-monday-row]").forEach((row) => {
    tl.from(row, { y: 40, opacity: 0, duration: 0.5 }).from(row.querySelector("dd"), { clipPath: "inset(0 100% 0 0)", duration: 0.6 }, "<0.1");
  });
  tl.from(section.querySelectorAll("[data-monday-foot]"), { opacity: 0, duration: 0.4 });
  return tl;
}

/** Simple per-element scroll reveal (one trigger each); safe to call alongside revealOnScroll. */
export function revealEach(targets: Iterable<Element>, y = 24) {
  for (const el of targets) {
    gsap.from(el, { y, opacity: 0, duration: 0.7, ease: EASE.out, scrollTrigger: { trigger: el, start: "top 90%", toggleActions: PLAY_ONCE } });
  }
}
