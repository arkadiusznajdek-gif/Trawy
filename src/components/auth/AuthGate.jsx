import { useEffect, useState } from "react";
import { supabase, setCurrentUserId, syncWithCloud } from "../../utils/storage";

export function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    let sessionVersion = 0;
    let latestSession = null;
    let syncing = false;

    async function applySession(nextSession) {
      const version = ++sessionVersion;
      latestSession = nextSession;
      setSession(nextSession);
      setCurrentUserId(nextSession?.user?.id ?? null);
      setError("");

      if (!nextSession) {
        setNotice("");
        setReady(true);
        return;
      }

      setReady(false);
      syncing = true;
      try {
        const result = await syncWithCloud(nextSession.user.id);
        if (active && version === sessionVersion) setNotice(result.message);
      } catch (syncError) {
        const message = syncError?.message || "Nieznany błąd synchronizacji.";
        if (active && version === sessionVersion) {
          setNotice(`Nie udało się połączyć z bazą: ${message}. Dane lokalne pozostają dostępne.`);
        }
      } finally {
        syncing = false;
        if (active && version === sessionVersion) setReady(true);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event !== "INITIAL_SESSION" && active) {
        queueMicrotask(() => {
          if (active) void applySession(nextSession);
        });
      }
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(`Nie udało się sprawdzić sesji: ${sessionError.message}`);
        setReady(true);
        return;
      }
      void applySession(data.session);
    }).catch((sessionError) => {
      if (!active) return;
      setError(`Nie udało się sprawdzić sesji: ${sessionError.message}`);
      setReady(true);
    });

    const handleSyncError = (event) => setNotice(`Synchronizacja oczekuje: ${event.detail}`);
    const handleCloudUpdated = () => window.location.reload();
    const handleVisibilityChange = async () => {
      if (!active || document.visibilityState !== "visible" || !latestSession || syncing) return;
      syncing = true;
      try {
        const result = await syncWithCloud(latestSession.user.id);
        if (!active) return;
        setNotice(result.message);
        if (result.updatedFromCloud) window.location.reload();
      } catch (syncError) {
        if (active) setNotice(`Synchronizacja oczekuje: ${syncError.message || "błąd połączenia z bazą"}`);
      } finally {
        syncing = false;
      }
    };
    window.addEventListener("app-sync-error", handleSyncError);
    window.addEventListener("app-cloud-data-updated", handleCloudUpdated);
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("app-sync-error", handleSyncError);
      window.removeEventListener("app-cloud-data-updated", handleCloudUpdated);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function submit() {
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError("Podaj e-mail i hasło.");
      return;
    }

    setSubmitting(true);
    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });
      if (result.error) {
        setError(result.error.message);
      } else if (mode === "signup" && !result.data.session) {
        setNotice("Konto utworzone. Potwierdź adres e-mail, a potem zaloguj się.");
      }
    } catch (authError) {
      setError(authError.message || "Nie udało się połączyć z usługą logowania.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(`Nie udało się wylogować: ${signOutError.message}`);
  }

  if (!ready) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6E7260" }}>Łączenie konta i synchronizacja danych…</div>;
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 360, margin: "60px auto", padding: 20, fontFamily: "sans-serif" }}>
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>Szkółka traw</h2>
        <p style={{ color: "#6E7260", fontSize: 14, lineHeight: 1.5 }}>
          Zaloguj się na to samo konto na komputerze i telefonie, aby korzystać ze wspólnych danych.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: 10, background: mode === "login" ? "#2C5282" : "#eee", color: mode === "login" ? "#fff" : "#333", border: "none", borderRadius: 8 }}>Logowanie</button>
          <button onClick={() => { setMode("signup"); setError(""); }} style={{ flex: 1, padding: 10, background: mode === "signup" ? "#2C5282" : "#eee", color: mode === "signup" ? "#fff" : "#333", border: "none", borderRadius: 8 }}>Rejestracja</button>
        </div>
        <input type="email" placeholder="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ccc" }} />
        <input type="password" placeholder="Hasło" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 8, border: "1px solid #ccc" }} />
        {error && <p role="alert" style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
        {notice && <p role="status" style={{ color: "#2C5282", fontSize: 13 }}>{notice}</p>}
        <button onClick={submit} disabled={submitting} style={{ width: "100%", padding: 12, background: "#2C5282", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Proszę czekać…" : mode === "login" ? "Zaloguj się" : "Załóż konto"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", font: "12px sans-serif", color: "#6E7260" }}>
        <span>{notice || `Zalogowano: ${session.user.email}`}</span>
        <button onClick={signOut} style={{ border: 0, background: "transparent", color: "#2C5282", cursor: "pointer", padding: 4 }}>Wyloguj</button>
      </div>
      {error && <p role="alert" style={{ maxWidth: 480, margin: "0 auto", padding: "4px 16px", color: "#c0392b", font: "13px sans-serif" }}>{error}</p>}
      {children}
    </>
  );
}
