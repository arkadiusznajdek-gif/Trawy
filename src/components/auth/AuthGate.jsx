import { useEffect } from "react";
import { supabase, setCurrentUserId, pullAllFromCloud } from "../../utils/storage";

export function AuthGate({ children }) {
  useEffect(() => {
    let active = true;

    async function syncSession(session) {
      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);
      if (userId && active) {
        await pullAllFromCloud();
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (active) syncSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) syncSession(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return children;
}
