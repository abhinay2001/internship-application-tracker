export default function Home() {
  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl border p-8">
        <h1 className="text-2xl font-semibold">Internship Application Tracker</h1>
        <p className="mt-2 text-sm opacity-75">
          Track applications, update statuses, set follow-up reminders, and view simple analytics.
          Built with Next.js + Supabase (Postgres + Auth + RLS).
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="rounded-lg bg-white px-4 py-2 text-sm text-black hover:opacity-90"
            href="/login"
          >
            Login / Sign up
          </a>
          <a className="rounded-lg border px-4 py-2 text-sm hover:bg-white/5" href="/dashboard">
            Dashboard
          </a>
          <a className="rounded-lg border px-4 py-2 text-sm hover:bg-white/5" href="/analytics">
            Analytics
          </a>
        </div>

        <div className="mt-6 text-xs opacity-60">
          Tip: Each user only sees their own applications via Row Level Security (RLS).
        </div>
      </div>
    </main>
  );
}