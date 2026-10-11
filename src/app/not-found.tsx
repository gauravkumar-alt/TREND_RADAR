import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center gap-6 px-4 md:px-10">
      <span className="micro text-signal">404 · No signal</span>
      <h1 className="display-xl text-6xl md:text-9xl">NOTHING ON THE RADAR HERE.</h1>
      <Link href="/radar" className="micro text-fg underline decoration-line-2 underline-offset-4">
        Back to the radar
      </Link>
    </section>
  );
}
