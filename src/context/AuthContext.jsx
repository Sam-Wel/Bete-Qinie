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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSession(session);
      loadProfile(session?.user?.id);
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

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, isAdmin, loading, signOut }}
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
