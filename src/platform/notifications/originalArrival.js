import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export const canUseOriginalPush = () =>
  import.meta.env.VITE_HEARTPIN_PUSH_ENABLED === "true" && Capacitor.isNativePlatform();

export function isOriginalArrivalAction(action) {
  return action?.actionId === "tap" && action.notification?.data?.type === "original_arrival";
}

export function listenForOriginalArrival(onArrival) {
  return PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    if (isOriginalArrivalAction(action)) onArrival();
  });
}
