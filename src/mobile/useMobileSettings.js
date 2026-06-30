import { useState, useCallback } from "react";
import { ANNIVERSARY } from "../api.js";

const KEY = "hp-mobile-settings";
const DEFAULTS = { theme: "coral", tone: "다정", mapSkin: "cozy", showChars: true, nameBara: "바라", nameNyong: "뇽이", anniv: null, myChar: null, alerts: true };

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { ...DEFAULTS }; }
}

export function useMobileSettings() {
  const [settings, setState] = useState(load);
  const setSettings = useCallback((patch) => {
    setState((prev) => { const next = { ...prev, ...patch }; localStorage.setItem(KEY, JSON.stringify(next)); return next; });
  }, []);
  return [settings, setSettings];
}

export function dday(settings, now = new Date()) {
  const base = new Date(((settings && settings.anniv) || ANNIVERSARY) + "T00:00:00");
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.round((t - base) / 86400000) + 1);
}
