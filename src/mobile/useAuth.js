import { useState, useCallback } from "react";
import * as api from "../api.js";

export function useAuth() {
  const [signedIn, setSignedIn] = useState(false);
  const supabase = api.getApiMode() === "supabase";
  const signIn = useCallback(async (email, password) => {
    if (typeof api.signInToSupabase === "function") await api.signInToSupabase(email, password);
    else throw new Error("Supabase 연결 전이에요. 곧 연결돼요.");
    setSignedIn(true);
  }, []);
  const signOut = useCallback(() => setSignedIn(false), []);
  return { needsLogin: supabase && !signedIn, signIn, signOut };
}
