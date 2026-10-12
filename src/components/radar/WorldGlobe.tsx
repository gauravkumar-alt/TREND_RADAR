"use client";
import { useEffect, useRef, useState } from "react";
import { geoCentroid, geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { gsap } from "@/lib/animations/gsap";
import { prefersReducedMotion } from "@/lib/animations/motion";
import { REGION_GEO, regionLabel } from "@/lib/config";

type Country = Feature<Geometry, { name?: string }> & { id?: string | number };

export interface CreatorCountry {
  iso: string;
  count: number;
}

/**
 * Rotating globe drawn inside the radar (an SVG <g>, so it lives in the radar's
 * coordinate space). The scan region glows: that is where YouTube reported
 * these videos as trending. Rings mark where the creators are based (their
 * listed channel country). Rendered client-side only; the map loads lazily.
 */
export function WorldGlobe({ regionCode, creators, r = 160 }: { regionCode: string; creators: CreatorCountry[]; r?: number }) {
  const root = useRef<SVGGElement>(null);
  const [world, setWorld] = useState<{ land: FeatureCollection; countries: Country[] } | null>(null);
  const region = REGION_GEO[regionCode] ?? REGION_GEO.IN;

  useEffect(() => {
    let alive = true;
    Promise.all([import("world-atlas/countries-110m.json"), import("topojson-client")]).then(([w, topo]) => {
      if (!alive) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topology = (w.default ?? w) as any;
      setWorld({
        land: topo.feature(topology, topology.objects.land) as unknown as FeatureCollection,
        countries: (topo.feature(topology, topology.objects.countries) as unknown as FeatureCollection<Geometry, { name?: string }>).features as Country[],
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const g = root.current;
    if (!world || !g) return;
    const regionShape = world.countries.find((c) => String(c.id) === region.iso);
    const byIso = new Map(world.countries.map((c) => [String(c.id), c]));
    const markers = creators
      .map((c) => {
        const f = byIso.get(c.iso);
        return f ? { ...c, at: geoCentroid(f) } : null;
      })
      .filter((m): m is CreatorCountry & { at: [number, number] } => Boolean(m));

    const tilt = -Math.max(-25, Math.min(25, region.lat * 0.7));
    const projection = geoOrthographic().scale(r).translate([0, 0]).clipAngle(90).precision(0.5);
    const path = geoPath(projection);
    const graticule = geoGraticule10();

    const el = (sel: string) => g.querySelector<SVGElement>(sel);
    const gratEl = el("[data-g-grat]");
    const landEl = el("[data-g-land]");
    const regionEl = el("[data-g-region]");
    const pin = el("[data-g-pin]");
    const markerEls = [...g.querySelectorAll<SVGCircleElement>("[data-g-creator]")];

    let lambda = -region.lon + 35; // start just before the region comes round
    const draw = () => {
      projection.rotate([lambda, tilt]);
      const centre: [number, number] = [-lambda, -tilt];
      gratEl?.setAttribute("d", path(graticule) ?? "");
      landEl?.setAttribute("d", path(world.land) ?? "");
      regionEl?.setAttribute("d", regionShape ? (path(regionShape) ?? "") : "");
      const front = geoDistance([region.lon, region.lat], centre) < Math.PI / 2 - 0.05;
      const p = projection([region.lon, region.lat]);
      if (pin && p) {
        pin.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
        pin.style.opacity = front ? "1" : "0";
      }
      markerEls.forEach((m, i) => {
        const mk = markers[i];
        const q = mk && projection(mk.at);
        const vis = mk && geoDistance(mk.at, centre) < Math.PI / 2 - 0.05;
        if (q) {
          m.setAttribute("cx", q[0].toFixed(1));
          m.setAttribute("cy", q[1].toFixed(1));
        }
        m.style.opacity = vis ? "1" : "0";
      });
    };

    if (prefersReducedMotion()) {
      lambda = -region.lon;
      draw();
      return;
    }
    draw();
    // ~80 s per revolution; skip work while the hero is off-screen.
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(g.ownerSVGElement ?? g);
    const tick = (_t: number, dt: number) => {
      if (!visible) return;
      lambda += (dt / 1000) * 4.5;
      draw();
    };
    gsap.ticker.add(tick);
    const pulse = gsap.fromTo(g.querySelectorAll("[data-g-pulse]"), { attr: { r: 4 }, opacity: 0.9 }, { attr: { r: 22 }, opacity: 0, duration: 1.8, repeat: -1, ease: "power1.out", stagger: 0.9 });
    const fade = gsap.from(g, { opacity: 0, duration: 1.2, ease: "power2.out" });
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      pulse.kill();
      fade.kill();
    };
  }, [world, region, creators, r]);

  const maxCount = Math.max(1, ...creators.map((c) => c.count));
  return (
    <g ref={root} aria-hidden>
      <defs>
        <radialGradient id="globeShade" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="var(--bg-3)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--bg)" stopOpacity="0.9" />
        </radialGradient>
        <filter id="regionGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle r={r} fill="url(#globeShade)" stroke="var(--line-2)" strokeWidth="1" />
      {world && (
        <>
          <path data-g-grat fill="none" stroke="var(--line-2)" strokeWidth="0.5" strokeOpacity="0.6" />
          <path data-g-land fill="var(--fg-3)" fillOpacity="0.28" stroke="var(--fg-3)" strokeOpacity="0.35" strokeWidth="0.4" />
          <path data-g-region fill="var(--signal)" fillOpacity="0.9" filter="url(#regionGlow)" />
          {creators.map((c) => (
            <circle key={c.iso} data-g-creator r={2.5 + (c.count / maxCount) * 4} fill="none" stroke="var(--fg)" strokeOpacity="0.85" strokeWidth="1.2" style={{ opacity: 0 }} />
          ))}
          <g data-g-pin style={{ opacity: 0 }}>
            <circle data-g-pulse r="4" fill="none" stroke="var(--signal)" strokeWidth="1.5" />
            <circle data-g-pulse r="4" fill="none" stroke="var(--signal)" strokeWidth="1.5" />
            <circle r="3.2" fill="var(--signal)" />
          </g>
        </>
      )}
      <text y={r + 26} textAnchor="middle" className="fill-signal" style={{ font: "600 10px var(--font-mono)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
        ● Trending in {regionLabel(regionCode)}
      </text>
    </g>
  );
}
