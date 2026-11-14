import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(undefined);

async function fetchProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Table may not exist yet if the SQL migration hasn't been run --
    // fail soft rather than breaking the whole app.
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export const AuthProvider = ({ children }) => {
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initialising, setInitialising] = useState(true);
  const [profilePending, setProfilePending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (userId) => {
      if (!userId) {
        setProfile(null);
        setProfilePending(false);
        return;
      }
      setProfilePending(true);
      const nextProfile = await fetchProfile(userId);
      if (cancelled) return;
      setProfile(nextProfile);
      setProfilePending(false);
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      await loadProfile(session?.user?.id);
      if (cancelled) return;
      setInitialising(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setSession(session);
      loadProfile(session?.user?.id);
      // Opened from a "set a new password" email: the app takes the person to that form,
      // even if Supabase sent the link to the home page.
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // A signed-in user whose profile is still in flight is not "not an admin" yet — saying
  // so would bounce them to sign-in while they are already signed in.
  const loading = initialising || profilePending;

  const signOut = () => supabase.auth.signOut();

  // Roles (supabase/admin_tools.sql): 'user', 'editor' (content), 'admin' (everything).
  const role = profile?.role ?? (session ? "user" : null);
  const isAdmin = role === "admin";
  const canEdit = role === "admin" || role === "editor";

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        isAdmin,
        canEdit,
        loading,
        signOut,
        passwordRecovery,
        clearPasswordRecovery: () => setPasswordRecovery(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
