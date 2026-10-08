import { useState, useEffect } from "react";
import { supabase, setCurrentUserId, pullAllFromCloud } from "../../utils/storage";

export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        setCurrentUserId(data.session.user.id);
        await pullAllFromCloud();
      }
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setCurrentUserId(newSession.user.id);
        await pullAllFromCloud();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit() {
    setError("");
    if (!email.trim() || !password) {
      setError("Podaj e-mail i hasło.");
      return;
    }
    const fn = mode === "login" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error: authError } = await fn({ email: email.trim(), password });
    if (authError) setError(authError.message);
  }

  if (!ready) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6E7260" }}>Wczytywanie…</div>;
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 340, margin: "60px auto", padding: 20, fontFamily: "sans-serif" }}>
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>Szkółka traw</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setMode("login")} style={{ flex: 1, padding: 10, background: mode === "login" ? "#2C5282" : "#eee", color: mode === "login" ? "#fff" : "#333", border: "none", borderRadius: 8 }}>Logowanie</button>
          <button onClick={() => setMode("signup")} style={{ flex: 1, padding: 10, background: mode === "signup" ? "#2C5282" : "#eee", color: mode === "signup" ? "#fff" : "#333", border: "none", borderRadius: 8 }}>Rejestracja</button>
        </div>
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ccc" }} />
        <input type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ccc" }} />
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
        <button onClick={submit} style={{ width: "100%", padding: 12, background: "#2C5282", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600 }}>
          {mode === "login" ? "Zaloguj się" : "Załóż konto"}
        </button>
      </div>
    );
  }

  return children;
}
