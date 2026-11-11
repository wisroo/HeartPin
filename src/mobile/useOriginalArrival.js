import { useCallback, useEffect, useState } from "react";
import { canUseOriginalPush, listenForOriginalArrival } from "../platform/notifications/originalArrival.js";

const PENDING_KEY = "hp-original-arrival-pending";

export function useOriginalArrival(enabled) {
  const available = enabled && canUseOriginalPush();
  const [pending, setPending] = useState(() => available && sessionStorage.getItem(PENDING_KEY) === "1");

  useEffect(() => {
    if (!available) return;
    let active = true;
    const listener = listenForOriginalArrival(() => {
      if (!active) return;
      sessionStorage.setItem(PENDING_KEY, "1");
      setPending(true);
    });
    return () => {
      active = false;
      listener.then((handle) => handle.remove()).catch(() => {});
    };
  }, [available]);

  const handled = useCallback(() => {
    sessionStorage.removeItem(PENDING_KEY);
    setPending(false);
  }, []);

  return { pending: available && pending, handled };
}
