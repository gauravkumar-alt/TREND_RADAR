"use client";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center gap-6 px-4">
      <ErrorState title="This page didn't load" message="Something went wrong while loading this page. Your data is safe." />
      <Button variant="outline" onClick={reset} className="self-start">
        Try again
      </Button>
    </section>
  );
}
