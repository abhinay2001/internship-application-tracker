"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestPage() {
  const [result, setResult] = useState("Testing...");

  useEffect(() => {
    (async () => {
      try {
        // This forces a simple request to Supabase REST
        const { data, error } = await supabase
          .from("applications")
          .select("id")
          .limit(1);

        if (error) {
          setResult(
            "Supabase error:\n" +
              JSON.stringify(
                { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code },
                null,
                2
              )
          );
        } else {
          setResult("Success! Connected.\nRows: " + (data?.length ?? 0));
        }
      } catch (e: any) {
        setResult("Fetch failed:\n" + (e?.message ?? String(e)));
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <pre>{result}</pre>
    </main>
  );
}