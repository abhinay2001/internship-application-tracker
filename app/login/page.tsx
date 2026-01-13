"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const signUp = async () => {
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? error.message : "Signup successful. Now login.");
  };

  const signIn = async () => {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else router.push("/dashboard");
  };

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Login</h2>
        <p className="mt-1 text-sm opacity-70">Sign in to manage your internship applications.</p>

        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border bg-transparent p-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border bg-transparent p-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={signIn} className="flex-1 rounded-lg bg-white px-4 py-2 text-sm text-black hover:opacity-90">
            Login
          </button>
          <button onClick={signUp} className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-white/5">
            Sign up
          </button>
        </div>

        {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}

        <p className="mt-5 text-xs opacity-60">
          Tip: If you ever get stuck, logout and login again to refresh session.
        </p>
      </div>
    </main>
  );
}