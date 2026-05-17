import { signInWithOAuth, signInWithPassword, signUpWithPassword } from "../../../actions/auth";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold text-cyan-200">Canva AI</p>
        <h1 className="mt-2 text-3xl font-bold">Sign in to your workspace</h1>
        <form action={async (formData) => { "use server"; await signInWithPassword(formData); }} className="mt-8 grid gap-4">
          <input className="rounded-xl border border-white/10 bg-white p-3 text-slate-950" name="email" placeholder="Email" type="email" required />
          <input className="rounded-xl border border-white/10 bg-white p-3 text-slate-950" name="password" placeholder="Password" type="password" required />
          <button className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950" type="submit">Sign in</button>
          <button formAction={async (formData) => { "use server"; await signUpWithPassword(formData); }} className="rounded-xl border border-white/20 px-4 py-3 font-semibold" type="submit">Create account</button>
        </form>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <form action={async () => { "use server"; await signInWithOAuth("google"); }}><button className="w-full rounded-xl border border-white/20 px-4 py-3 font-semibold" type="submit">Google</button></form>
          <form action={async () => { "use server"; await signInWithOAuth("github"); }}><button className="w-full rounded-xl border border-white/20 px-4 py-3 font-semibold" type="submit">GitHub</button></form>
        </div>
      </section>
    </main>
  );
}
