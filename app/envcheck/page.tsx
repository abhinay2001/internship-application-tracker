export default function EnvCheck() {
  return (
    <main style={{ padding: 24 }}>
      <pre>
        URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING"}
        {"\n"}
        KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING"}
      </pre>
    </main>
  );
}