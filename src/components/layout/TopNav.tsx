"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/radar", label: "Radar", n: "01" },
  { href: "/trends", label: "Trends", n: "02" },
  { href: "/brief", label: "Brief", n: "03" },
];

export function TopNav() {
  const path = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-14 max-w-[1600px] items-center gap-1.5 px-4 sm:gap-4 md:px-8">
        <Link href="/radar" className="shrink-0 font-display text-[13.5px] font-extrabold tracking-tight text-fg sm:text-[15px]" aria-label="TREND//RADAR home">
          TREND<span className="text-signal">{"//"}</span>RADAR
        </Link>
        <ul className="ml-auto flex min-w-0 items-center md:ml-10 md:gap-2">
          {LINKS.map((l) => {
            const active = path?.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("micro flex h-10 items-center gap-1.5 px-1.5 text-[10px] tracking-[0.08em] transition-colors sm:px-2 sm:text-[11px] sm:tracking-[0.12em] md:px-3", active ? "text-fg" : "text-fg-3 hover:text-fg")}
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
        <Link href="/settings" className="flex size-10 shrink-0 items-center justify-center text-fg-3 hover:text-fg md:hidden" aria-label="Settings">
          <SettingsIcon className="size-4" aria-hidden />
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
