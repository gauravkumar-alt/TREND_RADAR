import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorState({
  title,
  message,
  className,
  compact = false,
  settingsLink = false,
}: {
  title: string;
  message: string;
  className?: string;
  compact?: boolean;
  settingsLink?: boolean;
}) {
  return (
    <div role="alert" className={cn("flex gap-3 border border-cool/40 bg-cool/5 text-fg", compact ? "p-3" : "p-5", className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-cool" aria-hidden />
      <div className="flex flex-col gap-1">
        <span className="micro text-cool">{title}</span>
        <p className="text-sm text-fg-2">{message}</p>
        {settingsLink && (
          <Link href="/settings" className="micro mt-1 text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
            Open settings
          </Link>
        )}
      </div>
    </div>
  );
}
