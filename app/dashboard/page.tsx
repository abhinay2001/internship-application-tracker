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

  // NEW (Phase 2)
  company_normalized?: string | null;
  source_site?: string | null;
  role_level?: string | null;
  followup_status?: string | null; // pending/done
  last_followed_up_at?: string | null; // timestamptz
  outcome_reason?: string | null;
  rejection_stage?: string | null;
};

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"] as const;
const SOURCE_SITES = ["linkedin", "indeed", "company", "referral", "handshake", "other"] as const;
const ROLE_LEVELS = ["Intern", "New Grad", "Part-time", "Full-time", "Other"] as const;
const FOLLOWUP_STATUSES = ["pending", "done"] as const;

function normalizeCompany(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 &.-]/g, "");
}

function toISODate(input: string) {
  // accepts YYYY-MM-DD, returns same or null-ish upstream
  return input;
}

export default function DashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [msg, setMsg] = useState("");

  // Add form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Applied");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [nextFollowup, setNextFollowup] = useState(""); // YYYY-MM-DD
  const [notes, setNotes] = useState("");

  // NEW fields
  const [sourceSite, setSourceSite] = useState<(typeof SOURCE_SITES)[number]>("linkedin");
  const [roleLevel, setRoleLevel] = useState<(typeof ROLE_LEVELS)[number]>("Intern");
  const [followupStatus, setFollowupStatus] = useState<(typeof FOLLOWUP_STATUSES)[number]>("pending");
  const [outcomeReason, setOutcomeReason] = useState("");
  const [rejectionStage, setRejectionStage] = useState("");

  const load = async () => {
    setMsg("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("applications")
      .select(
        [
          "id",
          "company",
          "role",
          "status",
          "date_applied",
          "job_url",
          "location",
          "notes",
          "next_followup",
          "company_normalized",
          "source_site",
          "role_level",
          "followup_status",
          "last_followed_up_at",
          "outcome_reason",
          "rejection_stage",
        ].join(",")
      )
      .order("date_applied", { ascending: false });

    if (error) setMsg(error.message);
    else setApps(((data as unknown) as AppRow[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return apps;
    return apps.filter((a) => a.status === filter);
  }, [apps, filter]);

  // --- Helper: write audit event (best effort, don't block UX) ---
  const logEvent = async (event_type: string, application_id?: string, payload?: any) => {
    await supabase.from("application_events").insert({
      event_type,
      application_id: application_id ?? null,
      payload: payload ?? null,
    });
  };

  // --- Add Application (Phase 2) ---
  const addApp = async () => {
    setMsg("");
    if (!company.trim() || !role.trim()) {
      setMsg("Company and Role are required.");
      return;
    }

    const payload = {
      company: company.trim(),
      company_normalized: normalizeCompany(company),
      role: role.trim(),
      role_level: roleLevel,
      status,
      status_updated_at: new Date().toISOString(),
      job_url: jobUrl.trim() || null,
      location: location.trim() || null,
      next_followup: nextFollowup ? toISODate(nextFollowup) : null,
      notes: notes.trim() || null,
      source_site: sourceSite,
      followup_status: followupStatus,
      outcome_reason: outcomeReason.trim() || null,
      rejection_stage: rejectionStage.trim() || null,
    };

    // IMPORTANT: select inserted row so we get id for events/history
    const { data, error } = await supabase
      .from("applications")
      .insert(payload)
      .select("id, status")
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    // Status history initial event
    const { error: seErr } = await supabase.from("application_status_events").insert({
      application_id: data.id,
      from_status: null,
      to_status: data.status,
      source: "ui",
    });

    // Audit event
    await logEvent("app_created", data.id, payload);

    if (seErr) {
      // Not fatal; app was created successfully
      console.warn("status event insert failed:", seErr.message);
    }

    setCompany("");
    setRole("");
    setStatus("Applied");
    setJobUrl("");
    setLocation("");
    setNextFollowup("");
    setNotes("");
    setSourceSite("linkedin");
    setRoleLevel("Intern");
    setFollowupStatus("pending");
    setOutcomeReason("");
    setRejectionStage("");

    await load();
  };

  // --- Update a field on applications (existing) ---
  const updateField = async (id: string, patch: Partial<AppRow>) => {
    setMsg("");
    const { error } = await supabase.from("applications").update(patch).eq("id", id);
    if (error) setMsg(error.message);
    else await load();
  };

  // --- Status change wrapper (Phase 2) ---
  const changeStatus = async (row: AppRow, toStatus: string) => {
    const fromStatus = row.status;
    if (fromStatus === toStatus) return;

    setMsg("");

    // Update current state + status_updated_at
    const { error } = await supabase
      .from("applications")
      .update({ status: toStatus, status_updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    // Insert status event
    const { error: seErr } = await supabase.from("application_status_events").insert({
      application_id: row.id,
      from_status: fromStatus,
      to_status: toStatus,
      source: "ui",
    });

    // Audit event
    await logEvent("status_changed", row.id, { from: fromStatus, to: toStatus });

    if (seErr) console.warn("status event insert failed:", seErr.message);

    await load();
  };

  // --- Follow-up logging (Phase 2) ---
  const logFollowupDone = async (row: AppRow) => {
    setMsg("");

    // 1) insert followup log
    const { error: fErr } = await supabase.from("application_followups").insert({
      application_id: row.id,
      channel: "other",
      notes: "Followed up via dashboard",
    });

    if (fErr) {
      setMsg(fErr.message);
      return;
    }

    // 2) update application followup fields
    const nowIso = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("applications")
      .update({ followup_status: "done", last_followed_up_at: nowIso })
      .eq("id", row.id);

    if (uErr) {
      setMsg(uErr.message);
      return;
    }

    // 3) audit event
    await logEvent("followup_logged", row.id, { at: nowIso });

    await load();
  };

  // --- Delete (Phase 2: add audit event best-effort) ---
  const remove = async (row: AppRow) => {
    setMsg("");
    if (!confirm(`Delete application for ${row.company} - ${row.role}?`)) return;

    await logEvent("app_deleted_attempt", row.id, { company: row.company, role: row.role });

    const { error } = await supabase.from("applications").delete().eq("id", row.id);
    if (error) setMsg(error.message);
    else {
      await logEvent("app_deleted", row.id, { company: row.company, role: row.role });
      await load();
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Application Tracker</h2>
        <button onClick={logout} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-white/5">
          Logout
        </button>
      </div>

      <section className="mt-5 rounded-xl border p-4">
        <h3 className="font-medium">Add Application</h3>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border bg-transparent p-2"
            placeholder="Company *"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            className="rounded-lg border bg-transparent p-2"
            placeholder="Role *"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />

          <input
            className="rounded-lg border bg-transparent p-2"
            placeholder="Job URL (optional)"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
          <input
            className="rounded-lg border bg-transparent p-2"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div className="flex gap-3">
            <select
              className="w-full rounded-lg border bg-transparent p-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <input
              className="w-full rounded-lg border bg-transparent p-2"
              type="date"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select
              className="w-full rounded-lg border bg-transparent p-2"
              value={sourceSite}
              onChange={(e) => setSourceSite(e.target.value as any)}
            >
              {SOURCE_SITES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-lg border bg-transparent p-2"
              value={roleLevel}
              onChange={(e) => setRoleLevel(e.target.value as any)}
            >
              {ROLE_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <select
              className="w-full rounded-lg border bg-transparent p-2"
              value={followupStatus}
              onChange={(e) => setFollowupStatus(e.target.value as any)}
            >
              {FOLLOWUP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <input
              className="w-full rounded-lg border bg-transparent p-2"
              placeholder="Rejection stage (optional)"
              value={rejectionStage}
              onChange={(e) => setRejectionStage(e.target.value)}
            />
          </div>

          <input
            className="rounded-lg border bg-transparent p-2 md:col-span-2"
            placeholder="Outcome reason (optional)"
            value={outcomeReason}
            onChange={(e) => setOutcomeReason(e.target.value)}
          />

          <textarea
            className="rounded-lg border bg-transparent p-2 md:col-span-2"
            placeholder="Notes (optional)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
        <select
          className="rounded-lg border bg-transparent p-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <a className="ml-auto text-sm underline opacity-80 hover:opacity-100" href="/analytics">
          View analytics →
        </a>
      </section>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1220px] border-collapse text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-3">Company</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Applied</th>
              <th className="p-3">Follow-up</th>
              <th className="p-3">Source</th>
              <th className="p-3">Link</th>
              <th className="p-3">Notes</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b last:border-b-0 align-top">
                <td className="p-3">{a.company}</td>
                <td className="p-3">{a.role}</td>

                <td className="p-3">
                  <select
                    className="rounded-lg border bg-transparent p-2"
                    value={a.status}
                    onChange={(e) => changeStatus(a, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-3">{a.date_applied}</td>

                <td className="p-3">
                  <div className="flex flex-col gap-2">
                    <input
                      className="w-[150px] rounded-lg border bg-transparent p-2"
                      type="date"
                      value={a.next_followup ?? ""}
                      onChange={(e) => updateField(a.id, { next_followup: e.target.value || null })}
                    />

                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border bg-transparent p-2"
                        value={(a.followup_status ?? "pending") as any}
                        onChange={(e) => updateField(a.id, { followup_status: e.target.value as any })}
                      >
                        {FOLLOWUP_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => logFollowupDone(a)}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-white/5"
                      >
                        Mark done
                      </button>
                    </div>

                    {a.last_followed_up_at && (
                      <div className="text-xs opacity-70">Last: {new Date(a.last_followed_up_at).toLocaleString()}</div>
                    )}
                  </div>
                </td>

                <td className="p-3">
                  <select
                    className="rounded-lg border bg-transparent p-2"
                    value={(a.source_site ?? "other") as any}
                    onChange={(e) => updateField(a.id, { source_site: e.target.value as any })}
                  >
                    {SOURCE_SITES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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

                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <input
                      className="rounded-lg border bg-transparent p-2 text-xs"
                      placeholder="Outcome reason (optional)"
                      value={a.outcome_reason ?? ""}
                      onChange={(e) => updateField(a.id, { outcome_reason: e.target.value || null })}
                    />
                    <input
                      className="rounded-lg border bg-transparent p-2 text-xs"
                      placeholder="Rejection stage (optional)"
                      value={a.rejection_stage ?? ""}
                      onChange={(e) => updateField(a.id, { rejection_stage: e.target.value || null })}
                    />
                  </div>
                </td>

                <td className="p-3 text-right">
                  <button onClick={() => remove(a)} className="rounded-lg border px-3 py-1.5 hover:bg-white/5">
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="p-6 opacity-70" colSpan={9}>
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