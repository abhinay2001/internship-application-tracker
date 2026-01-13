"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type AppRow = {
  id: string;
  company: string;
  role: string;
  status: string;
  date_applied: string;
  job_url: string | null;
  location: string | null;
  notes: string | null;
  next_followup: string | null; // YYYY-MM-DD
};

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];

export default function DashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [filter, setFilter] = useState("All");
  const [msg, setMsg] = useState("");

  // Add form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Applied");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [nextFollowup, setNextFollowup] = useState(""); // YYYY-MM-DD
  const [notes, setNotes] = useState("");

  const load = async () => {
    setMsg("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("applications")
      .select("id, company, role, status, date_applied, job_url, location, notes, next_followup")
      .order("date_applied", { ascending: false });

    if (error) setMsg(error.message);
    else setApps((data as AppRow[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return apps;
    return apps.filter((a) => a.status === filter);
  }, [apps, filter]);

  const addApp = async () => {
    setMsg("");
    if (!company.trim() || !role.trim()) {
      setMsg("Company and Role are required.");
      return;
    }

    const payload = {
      company: company.trim(),
      role: role.trim(),
      status,
      job_url: jobUrl.trim() || null,
      location: location.trim() || null,
      next_followup: nextFollowup || null,
      notes: notes.trim() || null,
    };

    const { error } = await supabase.from("applications").insert(payload);

    if (error) setMsg(error.message);
    else {
      setCompany("");
      setRole("");
      setStatus("Applied");
      setJobUrl("");
      setLocation("");
      setNextFollowup("");
      setNotes("");
      await load();
    }
  };

  const updateField = async (id: string, patch: Partial<AppRow>) => {
    setMsg("");
    const { error } = await supabase.from("applications").update(patch).eq("id", id);
    if (error) setMsg(error.message);
    else await load();
  };

  const remove = async (id: string) => {
    setMsg("");
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) setMsg(error.message);
    else await load();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Application Tracker</h2>
        <button
          onClick={logout}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Logout
        </button>
      </div>

      <section className="mt-5 rounded-xl border p-4">
        <h3 className="font-medium">Add Application</h3>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded-lg border bg-transparent p-2" placeholder="Company *" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="rounded-lg border bg-transparent p-2" placeholder="Role *" value={role} onChange={(e) => setRole(e.target.value)} />

          <input className="rounded-lg border bg-transparent p-2" placeholder="Job URL (optional)" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
          <input className="rounded-lg border bg-transparent p-2" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />

          <div className="flex gap-3">
            <select className="w-full rounded-lg border bg-transparent p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="w-full rounded-lg border bg-transparent p-2" type="date" value={nextFollowup} onChange={(e) => setNextFollowup(e.target.value)} />
          </div>

          <textarea className="rounded-lg border bg-transparent p-2 md:col-span-2" placeholder="Notes (optional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button onClick={addApp} className="rounded-lg bg-white px-4 py-2 text-sm text-black hover:opacity-90">
            Add
          </button>
          {msg && <p className="text-sm opacity-80">{msg}</p>}
        </div>
      </section>

      <section className="mt-5 flex items-center gap-3">
        <label className="text-sm opacity-80">Filter:</label>
        <select className="rounded-lg border bg-transparent p-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="All">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <a className="ml-auto text-sm underline opacity-80 hover:opacity-100" href="/analytics">
          View analytics →
        </a>
      </section>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-3">Company</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Applied</th>
              <th className="p-3">Follow-up</th>
              <th className="p-3">Link</th>
              <th className="p-3">Notes</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b last:border-b-0">
                <td className="p-3">{a.company}</td>
                <td className="p-3">{a.role}</td>

                <td className="p-3">
                  <select
                    className="rounded-lg border bg-transparent p-2"
                    value={a.status}
                    onChange={(e) => updateField(a.id, { status: e.target.value })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>

                <td className="p-3">{a.date_applied}</td>

                <td className="p-3">
                  <input
                    className="w-[150px] rounded-lg border bg-transparent p-2"
                    type="date"
                    value={a.next_followup ?? ""}
                    onChange={(e) => updateField(a.id, { next_followup: e.target.value || null })}
                  />
                </td>

                <td className="p-3">
                  <input
                    className="w-[260px] rounded-lg border bg-transparent p-2"
                    placeholder="https://..."
                    value={a.job_url ?? ""}
                    onChange={(e) => updateField(a.id, { job_url: e.target.value || null })}
                  />
                </td>

                <td className="p-3">
                  <input
                    className="w-[320px] rounded-lg border bg-transparent p-2"
                    placeholder="Notes..."
                    value={a.notes ?? ""}
                    onChange={(e) => updateField(a.id, { notes: e.target.value || null })}
                  />
                </td>

                <td className="p-3 text-right">
                  <button onClick={() => remove(a.id)} className="rounded-lg border px-3 py-1.5 hover:bg-white/5">
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="p-6 opacity-70" colSpan={8}>
                  No applications yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}