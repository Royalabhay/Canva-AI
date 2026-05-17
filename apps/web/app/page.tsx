import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cyan-200">
          Canva AI Editor Platform
        </div>
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">Design engine for modern SaaS teams.</h1>
        <p className="max-w-2xl text-lg text-slate-300">
          A Fabric.js powered infinite canvas with production editor architecture, history, shortcuts, and autosave-ready state.
        </p>
        <Link className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300" href="/editor">
          Open editor
        </Link>
      </section>
    </main>
  );
}
