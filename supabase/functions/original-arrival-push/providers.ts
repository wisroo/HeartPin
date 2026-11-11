import { importPKCS8, SignJWT } from "npm:jose@6.1.3";
import { ORIGINAL_ARRIVAL_DATA, ORIGINAL_ARRIVAL_NOTIFICATION } from "./delivery.js";

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error("Missing push provider configuration");
  return value;
}

export function createPushSender() {
  function cachedToken(create: () => Promise<string>, lifetimeMs: number) {
    let cached: Promise<string> | undefined;
    let refreshAt = 0;
    return () => {
      if (!cached || Date.now() >= refreshAt) {
        refreshAt = Date.now() + lifetimeMs;
        cached = create().catch((error) => {
          cached = undefined;
          throw error;
        });
      }
      return cached;
    };
  }

  async function appleAuthorization() {
    const key = await importPKCS8(required("PUSH_APNS_PRIVATE_KEY"), "ES256");
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: required("PUSH_APNS_KEY_ID") })
      .setIssuer(required("PUSH_APNS_TEAM_ID")).setIssuedAt().sign(key);
  }

  async function googleAuthorization() {
    const account = JSON.parse(required("PUSH_FCM_SERVICE_ACCOUNT"));
    const key = await importPKCS8(account.private_key, "RS256");
    const audience = "https://oauth2.googleapis.com/token";
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
      .setProtectedHeader({ alg: "RS256" }).setIssuer(account.client_email)
      .setAudience(audience).setIssuedAt().setExpirationTime("10m").sign(key);
    const response = await fetch(audience, {
      method: "POST",
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("FCM authentication failed");
    const { access_token } = await response.json();
    if (!access_token) throw new Error("FCM token missing");
    return access_token;
  }

  const apnsAuthorization = cachedToken(appleAuthorization, 40 * 60_000);
  const fcmAuthorization = cachedToken(googleAuthorization, 40 * 60_000);

  return async (device: { platform: string; token: string }, expiresAt: string) => {
    const signal = AbortSignal.timeout(8000);
    if (device.platform === "ios") {
      const host = Deno.env.get("PUSH_APNS_SANDBOX") === "true"
        ? "api.sandbox.push.apple.com" : "api.push.apple.com";
      const response = await fetch(`https://${host}/3/device/${encodeURIComponent(device.token)}`, {
        method: "POST", signal,
        headers: {
          authorization: `bearer ${await apnsAuthorization()}`,
          "content-type": "application/json",
          "apns-topic": "com.heartpin.app",
          "apns-push-type": "alert",
          "apns-collapse-id": "original-arrival",
          "apns-expiration": String(Math.floor(Date.parse(expiresAt) / 1000)),
        },
        body: JSON.stringify({ aps: { alert: ORIGINAL_ARRIVAL_NOTIFICATION, sound: "default" }, ...ORIGINAL_ARRIVAL_DATA }),
      });
      if (response.ok) return "sent";
      if (response.status === 410) return "invalid";
      throw new Error("APNs delivery failed");
    }

    const project = encodeURIComponent(required("PUSH_FCM_PROJECT_ID"));
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
      method: "POST", signal,
      headers: { authorization: `Bearer ${await fcmAuthorization()}`, "content-type": "application/json" },
      body: JSON.stringify({ message: {
        token: device.token,
        notification: ORIGINAL_ARRIVAL_NOTIFICATION,
        data: ORIGINAL_ARRIVAL_DATA,
        android: {
          ttl: `${Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000))}s`,
          notification: { tag: "original-arrival" },
        },
      } }),
    });
    if (response.ok) return "sent";
    const body = await response.json().catch(() => null);
    if (body?.error?.details?.some((detail: { errorCode?: string }) => detail.errorCode === "UNREGISTERED")) {
      return "invalid";
    }
    throw new Error("FCM delivery failed");
  };
}
