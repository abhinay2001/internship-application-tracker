"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type AppRow = {
  id: string;
  status: string;
  date_applied: string; // YYYY-MM-DD
};

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];

function weekKey(dateStr: string) {
  // Simple week bucket: YYYY-WW based on UTC date
  const d = new Date(dateStr + "T00:00:00Z");
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.floor(days / 7) + 1;
  const yyyy = d.getUTCFullYear();
  return `${yyyy}-W${String(week).padStart(2, "0")}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AppRow[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("applications")
        .select("id, status, date_applied")
        .order("date_applied", { ascending: false });

      if (error) setMsg(error.message);
      else setRows((data as AppRow[]) ?? []);
    })();
  }, [router]);

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STATUSES) counts[s] = 0;
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }, [rows]);

  const byWeek = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const k = weekKey(r.date_applied);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const total = rows.length;
  const offers = byStatus["Offer"] ?? 0;
  const interviews = byStatus["Interview"] ?? 0;

  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <a className="text-sm underline opacity-80 hover:opacity-100" href="/dashboard">
          ← Back to dashboard
        </a>
      </div>

      {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Total applications</div>
          <div className="mt-1 text-3xl font-semibold">{total}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Interviews</div>
          <div className="mt-1 text-3xl font-semibold">{interviews}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Offers</div>
          <div className="mt-1 text-3xl font-semibold">{offers}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h3 className="font-medium">By status</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between">
                <span className="opacity-80">{s}</span>
                <span className="font-medium">{byStatus[s] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="font-medium">Applications per week</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {byWeek.length === 0 ? (
              <li className="opacity-70">No data yet.</li>
            ) : (
              byWeek.map(([wk, cnt]) => (
                <li key={wk} className="flex items-center justify-between">
                  <span className="opacity-80">{wk}</span>
                  <span className="font-medium">{cnt}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}