import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getApiMode, setOriginalPushRegistration } from "../api.js";
import { canUseOriginalPush, listenForOriginalArrival } from "../platform/notifications/originalArrival.js";

const INSTALLATION_KEY = "hp-original-push-installation";

export function useOriginalPush({ enabled, owner }) {
  const available = canUseOriginalPush() && getApiMode() === "supabase";
  const [pending, setPending] = useState(false);
  const previous = useRef(Promise.resolve());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!available) return;
    const listener = listenForOriginalArrival(() => setPending(true));
    listener.catch(() => setError("알림을 열 수 없어요."));
    return () => { listener.then((handle) => handle.remove()).catch(() => {}); };
  }, [available]);

  useEffect(() => {
    if (!available || !owner) return;
    let active = true;
    const listeners = [];
    let registration = Promise.resolve();
    let installation = localStorage.getItem(INSTALLATION_KEY);

    async function sync() {
      setError(null);
      if (!enabled) {
        if (installation) await setOriginalPushRegistration(installation, null);
        return;
      }
      const permission = await PushNotifications.requestPermissions();
      if (!active) return;
      if (permission.receive !== "granted") {
        if (installation) await setOriginalPushRegistration(installation, null);
        throw new Error("기기 설정에서 알림을 허용해 주세요.");
      }

      if (!installation) {
        installation = crypto.randomUUID();
        localStorage.setItem(INSTALLATION_KEY, installation);
      }
      listeners.push(await PushNotifications.addListener("registration", ({ value: token }) => {
        if (!active) return;
        registration = registration.then(() => setOriginalPushRegistration(installation, { owner, platform: Capacitor.getPlatform(), token }))
          .catch(() => { if (active) setError("알림 기기 등록에 실패했어요."); });
      }));
      listeners.push(await PushNotifications.addListener("registrationError", () => {
        if (active) setError("알림 기기 등록에 실패했어요.");
      }));
      if (active) await PushNotifications.register();
    }

    // Serialize opt-in changes with token writes from the previous effect.
    const task = previous.current.then(async () => {
      if (!active) return;
      try { await sync(); }
      catch (err) { if (active) setError(err.message || "알림 설정을 저장하지 못했어요."); }
    });
    return () => {
      active = false;
      previous.current = task.then(async () => {
        await registration;
        await Promise.all(listeners.map((handle) => handle.remove()));
      }).catch(() => {});
    };
  }, [available, enabled, owner]);

  const handled = useCallback(() => setPending(false), []);
  return { available, pending, error, handled };
}
