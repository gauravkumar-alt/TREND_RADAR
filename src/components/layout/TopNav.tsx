"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/radar", label: "Radar", n: "01" },
  { href: "/trends", label: "Trends", n: "02" },
  { href: "/brief", label: "Brief", n: "03" },
];

export function TopNav() {
  const path = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 md:px-8">
        <Link href="/radar" className="font-display text-[15px] font-extrabold tracking-tight text-fg" aria-label="TREND//RADAR home">
          TREND<span className="text-signal">{"//"}</span>RADAR
        </Link>
        <ul className="ml-auto flex items-center gap-1 md:ml-10 md:gap-2">
          {LINKS.map((l) => {
            const active = path?.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("micro flex h-9 items-center gap-1.5 px-2 transition-colors md:px-3", active ? "text-fg" : "text-fg-3 hover:text-fg")}
                >
                  <span className={cn("hidden md:inline", active ? "text-signal" : "text-fg-3")}>{l.n}</span>
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/settings"
          aria-current={path?.startsWith("/settings") ? "page" : undefined}
          className={cn("micro hidden h-9 items-center px-2 md:ml-auto md:flex", path?.startsWith("/settings") ? "text-fg" : "text-fg-3 hover:text-fg")}
        >
          Settings
        </Link>
        <Link href="/settings" className="micro flex h-9 items-center px-1 text-fg-3 hover:text-fg md:hidden" aria-label="Settings">
          ⚙
        </Link>
      </nav>
    </header>
  );
}
