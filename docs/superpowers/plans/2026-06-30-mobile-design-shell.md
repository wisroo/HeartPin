# HeartPin Mobile Design Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `HeartPin Mobile.html` design as a real-data mobile shell on `feature/mobile-design-shell` — buttonless splash → (Supabase) login → first-run pick-side → 5-tab app (여정·지도·＋·정리함·프로필) with Moment/Player/Settings/Couple/Upload overlays and a 7-theme color system.

**Architecture:** New mobile shell under `src/mobile/`. Tab/detail/overlay navigation is local component state in `MobileShell`; all domain data + mutations come from the existing `useHeartPinState` hook (passed as `app`). Screens are faithful ports of the design JSX with three mechanical swaps: `window.HP_*` globals → real `regions`/`ordered`/`suggest`/`inboxItems`; placeholder `Photo` → real-image `Photo`; design's `useTweaks` → `useMobileSettings` (localStorage). The design's preview chrome (device frame, OS toggle, tweaks panel) is not ported.

**Tech Stack:** React 18, Vite 6, Leaflet 1.9, Vitest 4 + Testing Library + jsdom. No new runtime dependencies.

## Global Constraints

- Branch: `feature/mobile-design-shell` (off `main`; do NOT merge the `spike/capacitor-mobile-upload` branch in).
- Develop/run in **`VITE_HEARTPIN_API_MODE=local`** — `supabase` mode throws on this branch (stub adapter). Do not edit the user's `.env.local`.
- Design source of truth: Claude Design project `ba7e4e10-7c96-4aee-9424-493fdc2a2892`, file `HeartPin Mobile.html` + `hpm-*.jsx` + `heartpin-data.js`. Task 1 vendors these into `docs/design-reference/`.
- Theme: default `coral`; apply via `data-theme` on the shell root. Implement all 7 themes (coral, trace, vivid, calm, mapfn, pop, dark).
- Character names default 바라 / 뇽이. Real data model: `regions.{domestic,intl}.trips[] → days[] → spots[]{id,name,time,lat,lng,mood,guide,reaction,photos[]}`; real photos are `{src,label,ratio,tint}`.
- Follow `AGENTS.md`: mobile shell under `src/mobile/`; shared state stays in `src/core/`; platform diffs behind adapters/shell boundaries. Stable `id` keys in lists. `useEffect` only for external sync (Leaflet, listeners).
- Do NOT touch `src/web/` or the desktop `Home.jsx`.
- After each task: `npm test -- --run` green, `git diff --check` clean. Build (`npm run build`) verified at integration tasks.

## Execution Order (build-safe)

The existing `MobileApp.jsx` imports `MobileMapShell` + `MobileUploadFlow`, and `App.jsx` imports `MobileApp`. To keep `npm run build` green after every task, **all new components are built as un-wired leaves first; the `MobileApp` rewrite and the deletion of the old shells happen last (Task 15)**. Until Task 15, the old mobile shell stays live and the new files are simply not imported by `App.jsx`.

Dispatch order: **1 → 2 → 3 → 4 → 5 → 7 → 8 → 9 → 11 → 12 → 10 → 13 → 14 → 6 → 15**.

- Tasks 5, 10, 14 are **create-only** here (no deletions, no `MobileApp` changes).
- Task 6 (`MobileShell`) is built after all screens/overlays exist so its imports resolve.
- Task 15 is the single integration step: rewrite `MobileApp` to the gate, delete `MobileMapShell` + `MobileUploadFlow` + their tests, remove the old `hpm-*`/`hpu-*` CSS, then full build/verify.
- During 1→14 the new design CSS coexists with the old `MobileMapShell` rules (same class names in a few cases); the old rules are removed in Task 15. This only affects manual runtime appearance of the soon-deleted old shell, not tests or build.

---

## File Structure

```
docs/design-reference/            ← Task 1: vendored design source (read-only reference)
  HeartPin-Mobile.html  hpm-app.jsx  hpm-ui.jsx  hpm-journey.jsx
  hpm-map.jsx  hpm-inbox.jsx  hpm-profile.jsx  hpm-upload.jsx  heartpin-data.js

src/mobile/
  MobileApp.jsx          (modify)  entry gate: splash → login(supabase) → pick-side(first run) → MobileShell
  LaunchSplash.jsx       (new)     buttonless brand splash, ~1.5s auto-advance, tap to skip
  MobileShell.jsx        (new)     tab/detail/overlay state, TabBar, FAB, data-theme root
  useAuth.js             (new)     thin auth seam (needsLogin/signIn/signOut); local mode → no login
  useMobileSettings.js   (new)     localStorage settings store
  onboarding/
    PickSide.jsx         (new)     one-time 바라/뇽이 picker → settings.myChar
    LoginScreen.jsx      (new)     restyled Supabase login form (uses useAuth.signIn)
  screens/
    JourneyScreen.jsx    (new)     여정 home: stats strip, region filter, trip gallery
    TripDetail.jsx       (new)     trip → days → spot cards, play-journey entry
    MapScreen.jsx        (new)     Leaflet + 3-snap bottom sheet + spot rail (replaces MobileMapShell)
    InboxScreen.jsx      (new)     정리함 grid + suggest "담기"
    ProfileScreen.jsx    (new)     우리: couple header, footprint stats, menu
  overlays/
    MomentViewer.jsx     (new)     photo viewer + reaction bubble
    JourneyPlayer.jsx    (new)     cinematic playback + Leaflet minimap
    SettingsScreen.jsx   (new)     settings incl. 7-theme picker
    CoupleScreen.jsx     (new)     names / anniversary / myChar
    UploadSheet.jsx      (new)     design upload sheet on the real upload pipeline
  ui/
    MobileAtoms.jsx      (new)     Ico, Photo(real-image), Avatar, Speech, Chip
  MobileMapShell.jsx     (delete)  replaced by screens/MapScreen.jsx
  MobileUploadFlow.jsx   (delete)  launch → LaunchSplash; upload → UploadSheet

src/styles.css           (modify)  + design tokens/7-themes/hpm-* rules (minus frame); − old MobileMapShell hpm-* rules
index.html               (modify)  viewport-fit=cover; fonts if not already loaded
```

---

## Phase 0 — Foundation

### Task 1: Vendor design reference + port CSS

**Files:**
- Create: `docs/design-reference/*` (9 files, fetched via DesignSync)
- Modify: `src/styles.css` (append mobile design block; later tasks remove old `hpm-*`)

**Interfaces:**
- Produces: design-token CSS variables on `.hpm` + `.hpm[data-theme="…"]`; all `hpm-*` component classes (splash, tabbar, fab, trip, spotcard, sheet, spotrail, listrow, moment, player, inbox, profile, settings, upload). Consumed by every screen task.

- [ ] **Step 1: Fetch the design files into `docs/design-reference/`**

Use DesignSync `get_file` (projectId `ba7e4e10-7c96-4aee-9424-493fdc2a2892`) for each of: `HeartPin Mobile.html`, `hpm-app.jsx`, `hpm-ui.jsx`, `hpm-journey.jsx`, `hpm-map.jsx`, `hpm-inbox.jsx`, `hpm-profile.jsx`, `hpm-upload.jsx`, `heartpin-data.js`. Write each to `docs/design-reference/` (rename `HeartPin Mobile.html` → `HeartPin-Mobile.html`). These are read-only references; the app never imports them.

- [ ] **Step 2: Append the design CSS to `src/styles.css`**

From `docs/design-reference/HeartPin-Mobile.html` `<style>` block, copy into `src/styles.css` **everything except** these preview-only selectors: `.hpm-stage`, `.hpm-controls*`, `.hpm-ctl*`, `.hpm-caption`, `.hpm-device`, `.hpm-bezel`, `.hpm-island`, `.hpm-punch`, `.hpm-homeind`, `.hpm-navpill`, and the `body{background:#16140f…}` / `#root` / `html,body` stage rules. Keep: the `.hpm{--…}` token block, all 7 `.hpm[data-theme="…"]` blocks, derived tints, and all component rules (`.hpm-screen`, `.hpm-app`, `.hpm-view`, `.hpm-pad`, `.hpm-top`, `.hpm-tabbar`, `.hpm-tab`, `.hpm-fab`, `.hpm-photo`, `.hpm-trip*`, `.hpm-spotcard*`, `.hpm-sheet*`, `.hpm-spotrail`, `.hpm-railcard*`, `.hpm-listrow*`, `.hpm-moment*`, `.hpm-player*`, `.hpm-inbox*`, `.hpm-icard*`, `.hpm-couple*`, `.hpm-fp`, `.hpm-menu*`, `.hpm-set*`, `.hpm-up*`, `.hpm-roll*`, `.hpm-toast`, `.hpm-overlay`, `.hpm-full`, `.hpm-pin`, `.hpm-mapchars`, `.hpm-leaflet`, `.hpm-map-*`, `.hpm-minimap*`, `.hpm-mmpin`, etc.). Wrap the block with a banner comment `/* ===== mobile design shell (ported from HeartPin Mobile.html) ===== */`.

- [ ] **Step 3: Replace the `.hpm-status` fixed paddings with safe-area insets**

In the copied `.hpm-status` / overlay top-bar rules, change fixed status-bar paddings (e.g. `padding-top:46px` on `.hpm-full .hpm-top`, `.hpm-status`) to `calc(env(safe-area-inset-top) + Npx)`, and `.hpm-tabbar` bottom padding to `calc(env(safe-area-inset-bottom) + 12px)`. (Status bar SVGs from `hpm-ui.jsx` are NOT ported — the OS draws the real one.)

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: build succeeds (CSS valid, no JS yet referencing it).

- [ ] **Step 5: Commit**

```bash
git add docs/design-reference src/styles.css
git commit -m "feat(mobile): vendor design reference + port shell CSS (no preview chrome)"
```

---

### Task 2: Mobile UI atoms

**Files:**
- Create: `src/mobile/ui/MobileAtoms.jsx`
- Test: `src/mobile/ui/MobileAtoms.test.jsx`

**Interfaces:**
- Consumes: `CHAR` from `../../chars.js` (has `.src`, `.name` per character).
- Produces:
  - `Ico` — object of icon components keyed `journey,map,plus,inbox,profile,gear,search,cam,pin,clock,play,chat,bell,pc,image,heart,skin` (each `(props) => <svg>`), ported verbatim from `docs/design-reference/hpm-ui.jsx`.
  - `Photo({ photo, label, tint, className, style, cap=true, onClick })` — real-image aware: if `photo?.src` set `backgroundImage`; else show `hpm-photo-cap` with `label ?? photo?.label`. Always class `hpm-photo tint-${tint ?? photo?.tint ?? "cool"}`.
  - `Avatar({ who, size=34, className, style })` — `<img>` from `CHAR[who].src`, class `hpm-av`.
  - `Speech({ who, text, compact })` — `hpm-speech ${who}` bubble with `hpm-who` (CHAR name) + `<p>`.
  - `Chip({ children, tint, active, sm, mono, onClick })` — `hpm-chip` with modifier classes.

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from "@testing-library/react";
import { Photo, Avatar, Speech, Ico } from "./MobileAtoms.jsx";

test("Photo shows caption when no src", () => {
  render(<Photo photo={{ label: "해운대", tint: "warm" }} />);
  expect(screen.getByText("해운대")).toBeInTheDocument();
});

test("Photo renders real image (no caption) when src present", () => {
  const { container } = render(<Photo photo={{ src: "http://x/a.jpg", label: "x", tint: "cool" }} />);
  expect(screen.queryByText("x")).toBeNull();
  expect(container.querySelector(".hpm-photo")).toHaveStyle({ backgroundImage: "url(http://x/a.jpg)" });
});

test("Avatar renders the character image", () => {
  render(<Avatar who="bara" size={40} />);
  expect(screen.getByRole("img")).toHaveAttribute("src");
});

test("Ico.journey renders an svg", () => {
  const { container } = render(<Ico.journey />);
  expect(container.querySelector("svg")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test -- --run src/mobile/ui/MobileAtoms.test.jsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `MobileAtoms.jsx`**

Port `Ico` verbatim from `docs/design-reference/hpm-ui.jsx`. Then:

```jsx
import { CHAR } from "../../chars.js";
export const Ico = { /* …paste the full Ico object from hpm-ui.jsx… */ };

export function Photo({ photo, label, tint, className = "", style = {}, cap = true, onClick }) {
  const t = tint ?? photo?.tint ?? "cool";
  const src = photo?.src;
  const lbl = label ?? photo?.label;
  const st = { ...style };
  if (src) { st.backgroundImage = `url(${src})`; st.backgroundSize = "cover"; st.backgroundPosition = "center"; }
  return (
    <div className={`hpm-photo tint-${t} ${className}`} style={st} onClick={onClick}>
      {cap && !src && lbl ? <span className="hpm-photo-cap">{lbl}</span> : null}
    </div>
  );
}

export function Avatar({ who, size = 34, className = "", style = {} }) {
  const c = CHAR[who] || CHAR.bara;
  return <img className={`hpm-av ${className}`} src={c.src} alt={c.name} style={{ width: size, height: size, ...style }} />;
}

export function Speech({ who, text, compact }) {
  const c = CHAR[who] || CHAR.bara;
  return (
    <div className={`hpm-speech ${who}`}>
      <Avatar who={who} size={compact ? 28 : 32} />
      <div className="hpm-bubble"><span className="hpm-who">{c.name}</span><p style={compact ? { fontSize: 12.5 } : null}>{text}</p></div>
    </div>
  );
}

export function Chip({ children, tint, active, sm, mono, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`hpm-chip ${active ? "on" : ""} ${tint || ""} ${sm ? "sm" : ""} ${mono ? "mono" : ""}`}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- --run src/mobile/ui/MobileAtoms.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/ui/MobileAtoms.jsx src/mobile/ui/MobileAtoms.test.jsx
git commit -m "feat(mobile): UI atoms (Ico, real-image Photo, Avatar, Speech, Chip)"
```

---

### Task 3: `useMobileSettings` (localStorage store)

**Files:**
- Create: `src/mobile/useMobileSettings.js`
- Test: `src/mobile/useMobileSettings.test.jsx`

**Interfaces:**
- Produces: `useMobileSettings()` → `[settings, setSettings]` where `settings` has keys `theme,tone,mapSkin,showChars,nameBara,nameNyong,anniv,myChar,alerts`; `setSettings(patch)` merges + persists to `localStorage["hp-mobile-settings"]`. Defaults: `{theme:"coral",tone:"다정",mapSkin:"cozy",showChars:true,nameBara:"바라",nameNyong:"뇽이",anniv:null,myChar:null,alerts:true}`. `dday(settings)` helper → number from `anniv` else `api.ANNIVERSARY`.

- [ ] **Step 1: Write failing tests**

```jsx
import { renderHook, act } from "@testing-library/react";
import { useMobileSettings, dday } from "./useMobileSettings.js";

beforeEach(() => localStorage.clear());

test("defaults to coral / 다정 / names", () => {
  const { result } = renderHook(() => useMobileSettings());
  expect(result.current[0]).toMatchObject({ theme: "coral", tone: "다정", nameBara: "바라", myChar: null });
});

test("setSettings merges and persists", () => {
  const { result } = renderHook(() => useMobileSettings());
  act(() => result.current[1]({ theme: "dark", myChar: "nyong" }));
  expect(result.current[0].theme).toBe("dark");
  expect(JSON.parse(localStorage.getItem("hp-mobile-settings")).myChar).toBe("nyong");
});

test("dday falls back to ANNIVERSARY when anniv unset", () => {
  expect(dday({ anniv: null })).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test -- --run src/mobile/useMobileSettings.test.jsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `useMobileSettings.js`**

```js
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
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- --run src/mobile/useMobileSettings.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/useMobileSettings.js src/mobile/useMobileSettings.test.jsx
git commit -m "feat(mobile): useMobileSettings localStorage store + dday helper"
```

---

### Task 4: `useAuth` seam

**Files:**
- Create: `src/mobile/useAuth.js`
- Test: `src/mobile/useAuth.test.jsx`

**Interfaces:**
- Consumes: `getApiMode` from `../api.js` (returns `"local"`|`"supabase"`); optional `api.signInToSupabase` (absent on this branch).
- Produces: `useAuth()` → `{ needsLogin, signIn(email,password), signOut() }`. On this branch: `local` mode → `needsLogin=false`. `supabase` mode → `needsLogin=true` until a successful `signIn`; `signIn` calls `api.signInToSupabase` if present, else throws "Supabase 연결 전이에요" (placeholder). State held in component memory (real session persistence arrives with the Supabase integration).

- [ ] **Step 1: Write failing tests**

```jsx
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "./useAuth.js";
import * as api from "../api.js";
import { vi } from "vitest";

test("local mode never needs login", () => {
  vi.spyOn(api, "getApiMode").mockReturnValue("local");
  const { result } = renderHook(() => useAuth());
  expect(result.current.needsLogin).toBe(false);
});

test("supabase mode needs login until signIn resolves", async () => {
  vi.spyOn(api, "getApiMode").mockReturnValue("supabase");
  vi.spyOn(api, "signInToSupabase").mockResolvedValue(undefined);
  const { result } = renderHook(() => useAuth());
  expect(result.current.needsLogin).toBe(true);
  await act(() => result.current.signIn("a@b.c", "pw"));
  expect(result.current.needsLogin).toBe(false);
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test -- --run src/mobile/useAuth.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement `useAuth.js`**

```js
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
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- --run src/mobile/useAuth.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mobile/useAuth.js src/mobile/useAuth.test.jsx
git commit -m "feat(mobile): thin useAuth seam (local skips login; supabase gates)"
```

---

## Phase 1 — Shell & routing

### Task 5: `LaunchSplash` + `MobileApp` entry gate

> **Execution-order override (build-safe):** This task creates ONLY `LaunchSplash` (Steps 1–4, then commit just the two LaunchSplash files). The `MobileApp` gate rewrite (Steps 5–8) is DEFERRED to Task 15 — do not modify `MobileApp.jsx` here. Its code below is the reference Task 15 will use.

**Files:**
- Create: `src/mobile/LaunchSplash.jsx`, `src/mobile/LaunchSplash.test.jsx`
- Modify: `src/mobile/MobileApp.jsx`
- Test: `src/mobile/MobileApp.test.jsx`

**Interfaces:**
- Consumes: `useAuth`, `useMobileSettings`, `dday`, `Avatar` (atoms), `api.dplus`.
- `LaunchSplash({ settings, onDone })` — buttonless brand splash (logo mark, `nameBara ♥ nameNyong`, `D+{dday}`, tagline "우리 여행, 핀 하나에 담다"). Auto-calls `onDone()` after 1500ms; tap anywhere also calls `onDone()`. Class `hpm-screen` + a `hpm-splash` wrapper.
- `MobileApp({ app })` (modified) — gate order: `splash` state (true→show LaunchSplash) → if `auth.needsLogin` show `LoginScreen` → if `!settings.myChar` show `PickSide` → else `MobileShell`. Holds `settings`/`setSettings` and passes to children. (LoginScreen/PickSide/MobileShell are imported but built in Tasks 6–8; stub them as `() => null` placeholders in this task ONLY if needed to compile, replaced by their real tasks — prefer ordering Tasks 6–8 before running MobileApp's full gate test.)

> Implementation note: To keep this task independently testable, test `LaunchSplash` fully here; test `MobileApp`'s gate with lightweight inline mocks of the child screens (vi.mock).

- [ ] **Step 1: Write failing test for LaunchSplash**

```jsx
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";
import LaunchSplash from "./LaunchSplash.jsx";

const settings = { nameBara: "바라", nameNyong: "뇽이", anniv: null };

test("auto-advances after 1.5s", () => {
  vi.useFakeTimers();
  const onDone = vi.fn();
  render(<LaunchSplash settings={settings} onDone={onDone} />);
  expect(onDone).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1500));
  expect(onDone).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});

test("tap skips immediately", () => {
  const onDone = vi.fn();
  render(<LaunchSplash settings={settings} onDone={onDone} />);
  fireEvent.click(screen.getByRole("button", { name: /시작/i }));
  expect(onDone).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- --run src/mobile/LaunchSplash.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement `LaunchSplash.jsx`**

```jsx
import { useEffect } from "react";
import { Avatar } from "./ui/MobileAtoms.jsx";
import { dday } from "./useMobileSettings.js";

export default function LaunchSplash({ settings, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1500); return () => clearTimeout(t); }, [onDone]);
  return (
    <button type="button" aria-label="시작" className="hpm-screen hpm-splash" onClick={onDone}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, width: "100%", border: "none", background: "var(--paper)" }}>
      <div className="mk" style={{ width: 64, height: 64 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Avatar who="bara" size={56} /><span style={{ color: "var(--p)", fontSize: 22 }}>♥</span><Avatar who="nyong" size={56} />
      </div>
      <div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "var(--ink)" }}>{settings.nameBara} ♥ {settings.nameNyong}</div>
      <span className="hpm-chip on">D+{dday(settings)}</span>
      <p style={{ fontFamily: "var(--fb)", color: "var(--ink2)" }}>우리 여행, 핀 하나에 담다</p>
    </button>
  );
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- --run src/mobile/LaunchSplash.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Modify `MobileApp.jsx` to the gate**

```jsx
import { useState } from "react";
import { useAuth } from "./useAuth.js";
import { useMobileSettings } from "./useMobileSettings.js";
import LaunchSplash from "./LaunchSplash.jsx";
import LoginScreen from "./onboarding/LoginScreen.jsx";
import PickSide from "./onboarding/PickSide.jsx";
import MobileShell from "./MobileShell.jsx";

export default function MobileApp({ app }) {
  const [splashDone, setSplashDone] = useState(false);
  const [settings, setSettings] = useMobileSettings();
  const auth = useAuth();
  if (!splashDone) return <LaunchSplash settings={settings} onDone={() => setSplashDone(true)} />;
  if (auth.needsLogin) return <LoginScreen onSignIn={auth.signIn} settings={settings} />;
  if (!settings.myChar) return <PickSide settings={settings} onPick={(who) => setSettings({ myChar: who })} />;
  return <MobileShell app={app} settings={settings} setSettings={setSettings} />;
}
```

- [ ] **Step 6: Write `MobileApp.test.jsx` with child mocks**

```jsx
import { render, screen, act } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("./MobileShell.jsx", () => ({ default: () => <div>SHELL</div> }));
vi.mock("./onboarding/LoginScreen.jsx", () => ({ default: () => <div>LOGIN</div> }));
vi.mock("./onboarding/PickSide.jsx", () => ({ default: () => <div>PICK</div> }));
import * as authMod from "./useAuth.js";
import MobileApp from "./MobileApp.jsx";

beforeEach(() => localStorage.clear());

test("local + no myChar: splash → pick-side → shell after pick", async () => {
  vi.spyOn(authMod, "useAuth").mockReturnValue({ needsLogin: false, signIn: vi.fn(), signOut: vi.fn() });
  vi.useFakeTimers();
  render(<MobileApp app={{}} />);
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText("PICK")).toBeInTheDocument();
  vi.useRealTimers();
});

test("supabase + needsLogin shows LOGIN after splash", () => {
  vi.spyOn(authMod, "useAuth").mockReturnValue({ needsLogin: true, signIn: vi.fn(), signOut: vi.fn() });
  vi.useFakeTimers();
  render(<MobileApp app={{}} />);
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText("LOGIN")).toBeInTheDocument();
  vi.useRealTimers();
});
```

> NOTE: This test depends on Tasks 6–8 existing for imports to resolve (they are mocked, so empty files suffice). If executing strictly in order, create empty default-export stubs for `MobileShell.jsx`, `onboarding/LoginScreen.jsx`, `onboarding/PickSide.jsx` now and flesh them out in their tasks.

- [ ] **Step 7: Run, verify pass**

Run: `npm test -- --run src/mobile/MobileApp.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add src/mobile/LaunchSplash.jsx src/mobile/LaunchSplash.test.jsx src/mobile/MobileApp.jsx src/mobile/MobileApp.test.jsx
git commit -m "feat(mobile): buttonless splash + entry-gate routing"
```

---

### Task 6: `MobileShell` (tab bar, FAB, overlay stack, theme root)

**Files:**
- Create: `src/mobile/MobileShell.jsx`, `src/mobile/MobileShell.test.jsx`

**Interfaces:**
- Consumes: `app` (useHeartPinState), `settings`, `setSettings`, `Ico`, all screen + overlay components (built in later tasks — stub as `() => null` if executing strictly in order, replace per task).
- Produces: `nav` object passed to screens — `{ back, openTrip(trip), openMap(trip,idx), openMoment(spot,idx), openMomentItem(item), openPlayer(trip), openSettings(), openCouple(), openUpload(), close(), toast(msg), setSettings }`. Local state: `tab` ("journey"|"map"|"inbox"|"profile"), `detail` (trip|null), `overlays[]` ({type,...}). Root element: `<div className="hpm-screen dotgrid" data-theme={settings.theme} data-platform={platform}>`.
- Port the `nav`, `switchTab`, `TabBar`, overlay-stack rendering, and toast from `docs/design-reference/hpm-app.jsx` (drop `PhoneFrame`/`StatusBar`/`TweaksPanel`/platform-toggle/scale logic). `mapTrip` defaults to the first trip from `app.regions` (handle empty: no trips → Map tab shows an empty state).

- [ ] **Step 1: Write failing test**

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("./screens/JourneyScreen.jsx", () => ({ default: ({ nav }) => <button onClick={() => nav.openUpload()}>여정화면</button> }));
vi.mock("./screens/InboxScreen.jsx", () => ({ default: () => <div>정리함화면</div> }));
// (mock the other screens/overlays similarly → <div>name</div>)
import MobileShell from "./MobileShell.jsx";

const app = { regions: { domestic: { trips: [] }, intl: { trips: [] } }, inboxItems: [] };
const settings = { theme: "coral" };

test("renders journey tab by default and switches to inbox", () => {
  render(<MobileShell app={app} settings={settings} setSettings={() => {}} />);
  expect(screen.getByText("여정화면")).toBeInTheDocument();
  fireEvent.click(screen.getByText("정리함"));
  expect(screen.getByText("정리함화면")).toBeInTheDocument();
});

test("FAB opens upload overlay", () => {
  render(<MobileShell app={app} settings={settings} setSettings={() => {}} />);
  fireEvent.click(screen.getByText("여정화면")); // triggers nav.openUpload via mock
  expect(screen.getByText(/업로드/)).toBeInTheDocument(); // UploadSheet mock renders "업로드"
});

test("applies the theme via data-theme", () => {
  const { container } = render(<MobileShell app={app} settings={{ theme: "dark" }} setSettings={() => {}} />);
  expect(container.querySelector("[data-theme='dark']")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- --run src/mobile/MobileShell.test.jsx` → FAIL.

- [ ] **Step 3: Implement `MobileShell.jsx`** (port from `hpm-app.jsx`, adapted)

```jsx
import { useState, useRef } from "react";
import { Ico } from "./ui/MobileAtoms.jsx";
import JourneyScreen from "./screens/JourneyScreen.jsx";
import TripDetail from "./screens/TripDetail.jsx";
import MapScreen from "./screens/MapScreen.jsx";
import InboxScreen from "./screens/InboxScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import MomentViewer from "./overlays/MomentViewer.jsx";
import JourneyPlayer from "./overlays/JourneyPlayer.jsx";
import SettingsScreen from "./overlays/SettingsScreen.jsx";
import CoupleScreen from "./overlays/CoupleScreen.jsx";
import UploadSheet from "./overlays/UploadSheet.jsx";

const TABS = [["journey","여정","journey"],["map","지도","map"],["__fab","",""],["inbox","정리함","inbox"],["profile","프로필","profile"]];
const detectPlatform = () => (/iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "android");

export default function MobileShell({ app, settings, setSettings }) {
  const [tab, setTab] = useState("journey");
  const [detail, setDetail] = useState(null);
  const [mapTrip, setMapTrip] = useState(null);
  const [mapIdx, setMapIdx] = useState(0);
  const [overlays, setOverlays] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const allTrips = [...app.regions.domestic.trips, ...app.regions.intl.trips];

  const push = (o) => setOverlays((s) => [...s, o]);
  const popOverlay = () => setOverlays((s) => s.slice(0, -1));
  const showToast = (m) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 1900); };

  const nav = {
    back: () => { if (overlays.length) popOverlay(); else if (detail) setDetail(null); },
    openTrip: (trip) => setDetail(trip),
    openMap: (trip, idx) => { setMapTrip(trip); setMapIdx(idx || 0); setDetail(null); setOverlays([]); setTab("map"); },
    openMoment: (spot, idx) => push({ type: "moment", spot, idx: idx || 0 }),
    openMomentItem: (item) => push({ type: "moment", spot: { name: item.autoLabel, photos: [item], time: item.time, reaction: "이 사진 마음에 들어! 📸" }, idx: 0 }),
    openPlayer: (trip) => push({ type: "player", trip }),
    openSettings: () => push({ type: "settings" }),
    openCouple: () => push({ type: "couple" }),
    openUpload: () => push({ type: "upload" }),
    close: () => setOverlays([]),
    toast: showToast, setSettings,
  };

  const switchTab = (name) => { if (name === "__fab") return nav.openUpload(); setDetail(null); setOverlays([]); setTab(name); };

  let root;
  if (tab === "journey") root = detail ? <TripDetail trip={detail} nav={nav} settings={settings} /> : <JourneyScreen app={app} nav={nav} settings={settings} />;
  else if (tab === "map") root = <MapScreen key={(mapTrip || allTrips[0])?.id + ":" + mapIdx} trip={mapTrip || allTrips[0]} initialSpotIdx={mapIdx} nav={{ ...nav, back: () => switchTab("journey") }} settings={settings} />;
  else if (tab === "inbox") root = <InboxScreen app={app} nav={nav} settings={settings} />;
  else root = <ProfileScreen app={app} nav={nav} settings={settings} />;

  return (
    <div className="hpm-screen dotgrid" data-theme={settings.theme} data-platform={detectPlatform()} style={{ height: "100%" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>{root}</div>
      <nav className="hpm-tabbar">
        {TABS.map(([name, label, ico]) => name === "__fab"
          ? (<span key="fab" style={{ display: "contents" }}><button className="hpm-tab spacer"><div className="ti" /><div className="tl" /></button><button className="hpm-fab" aria-label="올리기" onClick={() => switchTab("__fab")}><Ico.plus /></button></span>)
          : (<button key={name} className={`hpm-tab ${tab === name ? "on" : ""}`} onClick={() => switchTab(name)}><div className="ti">{Ico[ico]()}</div><div className="tl">{label}</div></button>))}
      </nav>
      {overlays.map((o, i) => (
        <div key={i}>
          {o.type === "moment" && <MomentViewer spot={o.spot} startIdx={o.idx} nav={nav} settings={settings} />}
          {o.type === "player" && <JourneyPlayer trip={o.trip} nav={nav} settings={settings} />}
          {o.type === "settings" && <SettingsScreen nav={nav} settings={settings} />}
          {o.type === "couple" && <CoupleScreen nav={nav} settings={settings} />}
          {o.type === "upload" && <UploadSheet app={app} nav={nav} settings={settings} />}
        </div>
      ))}
      {toast && <div className="hpm-toast">{toast}</div>}
    </div>
  );
}
```

> If executing strictly in order, create minimal default-export stubs for the screen/overlay imports now; flesh out per task. The test mocks them anyway.

- [ ] **Step 4: Run, verify pass** — `npm test -- --run src/mobile/MobileShell.test.jsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mobile/MobileShell.jsx src/mobile/MobileShell.test.jsx
git commit -m "feat(mobile): tab-bar shell with FAB, overlay stack, theme root"
```

---

## Phase 2 — Onboarding & login

### Task 7: `PickSide` (first-run character pick)

**Files:** Create `src/mobile/onboarding/PickSide.jsx`, `PickSide.test.jsx`

**Interfaces:** `PickSide({ settings, onPick })` — full-screen `hpm-screen`; two big cards (바라 / 뇽이) using `Avatar`; tapping calls `onPick(who)`. Copy: "누구의 폰인가요?" + "한 번만 골라주세요". Uses `settings.nameBara/nameNyong` for labels.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import PickSide from "./PickSide.jsx";
test("calls onPick with the chosen character", () => {
  const onPick = vi.fn();
  render(<PickSide settings={{ nameBara: "바라", nameNyong: "뇽이" }} onPick={onPick} />);
  fireEvent.click(screen.getByRole("button", { name: /뇽이/ }));
  expect(onPick).toHaveBeenCalledWith("nyong");
});
```
(import `{ vi }` from vitest)

- [ ] **Step 2: Run, verify fail.** `npm test -- --run src/mobile/onboarding/PickSide.test.jsx`

- [ ] **Step 3: Implement**

```jsx
import { Avatar } from "../ui/MobileAtoms.jsx";
export default function PickSide({ settings, onPick }) {
  return (
    <div className="hpm-screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
      <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--ink)" }}>누구의 폰인가요?</h2>
      <p style={{ color: "var(--ink2)" }}>한 번만 골라주세요</p>
      <div style={{ display: "flex", gap: 16 }}>
        {[["bara", settings.nameBara], ["nyong", settings.nameNyong]].map(([who, name]) => (
          <button key={who} className="hpm-card" onClick={() => onPick(who)} aria-label={name}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "22px 26px", background: "var(--card)" }}>
            <Avatar who={who} size={84} />
            <span style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--ink)" }}>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass.** **Step 5: Commit**

```bash
git add src/mobile/onboarding/PickSide.jsx src/mobile/onboarding/PickSide.test.jsx
git commit -m "feat(mobile): first-run pick-side onboarding"
```

---

### Task 8: `LoginScreen` (restyled Supabase login)

**Files:** Create `src/mobile/onboarding/LoginScreen.jsx`, `LoginScreen.test.jsx`

**Interfaces:** `LoginScreen({ onSignIn, settings })` — restyled form (logo mark + 바라♥뇽이 + "HeartPin 로그인"), email + password inputs (`hpm-cinput`-styled), submit button `hpm-btn block`. On submit → `await onSignIn(email.trim(), password)`; show error text on throw; disable while busy. Mirrors the spike `SupabaseLogin` behavior but in the design's visual language. No `window.location.reload()` — `onSignIn` flips the gate.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import LoginScreen from "./LoginScreen.jsx";

test("submits credentials via onSignIn", async () => {
  const onSignIn = vi.fn().mockResolvedValue();
  render(<LoginScreen onSignIn={onSignIn} settings={{ nameBara: "바라", nameNyong: "뇽이" }} />);
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "a@b.c" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "pw" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  await waitFor(() => expect(onSignIn).toHaveBeenCalledWith("a@b.c", "pw"));
});

test("shows error message on failed sign-in", async () => {
  const onSignIn = vi.fn().mockRejectedValue(new Error("로그인 실패"));
  render(<LoginScreen onSignIn={onSignIn} settings={{ nameBara: "바라", nameNyong: "뇽이" }} />);
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "a@b.c" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "x" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByText("로그인 실패")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**

```jsx
import { useState } from "react";
import { Avatar } from "../ui/MobileAtoms.jsx";

export default function LoginScreen({ onSignIn, settings }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await onSignIn(email.trim(), password); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="hpm-screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <div className="mk" style={{ width: 48, height: 48, marginBottom: 10 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6 }}><Avatar who="bara" size={36} /><span style={{ color: "var(--p)" }}>♥</span><Avatar who="nyong" size={36} /></div>
      <h1 style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--ink)", marginBottom: 16 }}>HeartPin 로그인</h1>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 13, color: "var(--ink2)" }}>이메일
          <input className="hpm-cinput" style={{ width: "100%", textAlign: "left" }} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, color: "var(--ink2)" }}>비밀번호
          <input className="hpm-cinput" style={{ width: "100%", textAlign: "left" }} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <small style={{ color: "var(--pd)" }}>{error}</small>}
        <button className="hpm-btn block" type="submit" disabled={busy || !email.trim() || !password}>{busy ? "로그인 중…" : "로그인"}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass.** **Step 5: Commit**

```bash
git add src/mobile/onboarding/LoginScreen.jsx src/mobile/onboarding/LoginScreen.test.jsx
git commit -m "feat(mobile): restyled Supabase login screen (uses useAuth.signIn)"
```

---

## Phase 3 — Core screens

### Task 9: `JourneyScreen` + `TripDetail`

**Files:** Create `src/mobile/screens/JourneyScreen.jsx`, `TripDetail.jsx`, `JourneyScreen.test.jsx`

**Interfaces:**
- `JourneyScreen({ app, nav, settings })` — port from `docs/design-reference/hpm-journey.jsx`. Swaps: `window.HP_DATA.regions` → `app.regions`; `tripStats` computed from real `ordered(trip)` (`import { ordered } from "../../data.js"`); `t.cover` → real cover photo via `Photo`; region filter 전체/국내/국외. Trip tap → `nav.openTrip(t)`.
- `TripDetail({ trip, nav, settings })` — port from `hpm-journey.jsx`. Lines: `mobileLines(spot, settings)` → if `settings.tone==="다정"` use `spot.guide/spot.reaction`, else `autoLine({time:spot.time})` (`import { ordered, autoLine } from "../../data.js"`). Spot card cover → `nav.openMoment(spot,0)`; "지도에서 보기" → `nav.openMap(trip, globalIdx)`; "여정 재생" → `nav.openPlayer(trip)`.
- Produces: `mobileLines` helper (define once in `TripDetail.jsx`, export for reuse by MomentViewer/JourneyPlayer).

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import JourneyScreen from "./JourneyScreen.jsx";

const trip = { id: "busan", region: "domestic", title: "부산", dateLabel: "2025.10", tags: ["바다"],
  cover: { label: "광안대교", tint: "cool" },
  days: [{ label: "Day 1", date: "10.11", spots: [{ id: "h", name: "해운대", time: "11:40", lat: 35, lng: 129, photos: [{ label: "p", tint: "cool" }] }] }] };
const app = { regions: { domestic: { trips: [trip] }, intl: { trips: [] } } };

test("renders trip titles and totals; tapping opens trip", () => {
  const nav = { openTrip: vi.fn() };
  render(<JourneyScreen app={app} nav={nav} settings={{ tone: "다정" }} />);
  expect(screen.getByText("부산")).toBeInTheDocument();
  fireEvent.click(screen.getByText("부산"));
  expect(nav.openTrip).toHaveBeenCalledWith(trip);
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement `JourneyScreen.jsx` + `TripDetail.jsx`** porting from `hpm-journey.jsx` with the swaps above. (Use real `Photo`, `Avatar`, `Speech`, `Ico` from `../ui/MobileAtoms.jsx`; `ordered`/`autoLine` from `../../data.js`.)
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit**

```bash
git add src/mobile/screens/JourneyScreen.jsx src/mobile/screens/TripDetail.jsx src/mobile/screens/JourneyScreen.test.jsx
git commit -m "feat(mobile): 여정 home + trip detail on real data"
```

---

### Task 10: `MapScreen` (replaces `MobileMapShell`)

> **Execution-order override (build-safe):** CREATE `MapScreen.jsx` + test only (Steps 1–4, then commit just MapScreen). The `MobileMapShell` deletion and old-CSS removal (Steps 5–7) are DEFERRED to Task 15 — deleting it now breaks the still-live old `MobileApp`.

**Files:** Create `src/mobile/screens/MapScreen.jsx`, `MapScreen.test.jsx`; Delete `src/mobile/MobileMapShell.jsx`; Modify `src/styles.css` (remove old `hpm-shell/hpm-map/hpm-sheet/hpm-grabber/hpm-tabs/hpm-tab-ico/hpm-add/hpm-badge` rules that belonged to MobileMapShell).

**Interfaces:** `MapScreen({ trip, initialSpotIdx, nav, settings })` — port from `docs/design-reference/hpm-map.jsx`. Swaps: `window.HP_ORDERED(trip)` → `ordered(trip)` from `../../data.js`; real photos in rail/list cards; tile URL + attribution from `../../mapUtil.js` (`import { TILES, ATTR }`) instead of the hardcoded CARTO string; char avatars from `CHAR`. Keep the 3-snap sheet, spot rail, animated pins. Empty trip (`!trip`) → render an empty-state message instead of initializing Leaflet.

> Testing note: Leaflet can't render in jsdom. `vi.mock("leaflet")` with a stub (`map`/`tileLayer`/`marker`/`divIcon`/`polyline` returning chainable no-ops), then assert the sheet header, spot-rail card names, and snap toggling — not the map canvas.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("leaflet", () => { const chain = () => obj; const obj = { setView: () => obj, addTo: () => obj, on: () => obj, fitBounds: () => obj, panTo: () => obj, invalidateSize: () => obj, remove: () => obj, setIcon: () => obj, removeLayer: () => obj, setLatLngs: () => obj, setZIndexOffset: () => obj }; return { default: { map: () => obj, tileLayer: () => obj, marker: () => obj, divIcon: () => ({}), polyline: () => obj, layerGroup: () => obj } }; });
import MapScreen from "./MapScreen.jsx";

const trip = { id: "t", title: "부산", days: [{ label: "Day 1", date: "10.11", spots: [
  { id: "a", name: "해운대", time: "11:40", lat: 35.1, lng: 129.1, photos: [{ label: "p", tint: "cool" }] },
  { id: "b", name: "광안리", time: "18:30", lat: 35.15, lng: 129.11, photos: [{ label: "q", tint: "warm" }] }] }] };

test("shows spot rail with spot names", () => {
  render(<MapScreen trip={trip} initialSpotIdx={0} nav={{ back: () => {} }} settings={{ mapSkin: "cozy", showChars: true }} />);
  expect(screen.getByText("해운대")).toBeInTheDocument();
  expect(screen.getByText("광안리")).toBeInTheDocument();
});

test("empty trip renders an empty state, not a crash", () => {
  render(<MapScreen trip={null} nav={{ back: () => {} }} settings={{}} />);
  expect(screen.getByText(/여행/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement `MapScreen.jsx`** (port from `hpm-map.jsx`, swaps above, empty-state guard).
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Delete `MobileMapShell.jsx` and remove its CSS**

```bash
git rm src/mobile/MobileMapShell.jsx
```
Remove the old MobileMapShell rules from `src/styles.css` (search `hpm-shell`, `hpm-grabber`, `hpm-tabs`, `hpm-tab-ico`, `hpm-add`, `.hpm-badge`, and the MobileMapShell `.hpm-map`/`.hpm-sheet` variants that predate Task 1). Verify no `hpm-shell`/`hpm-tabs` references remain: `grep -rn "hpm-shell\|hpm-tabs\|hpm-grabber" src` → empty.

- [ ] **Step 6: Run full tests + build**

Run: `npm test -- --run` then `npm run build`
Expected: green; build OK. (MobileMapShell no longer imported — its only importer was the old MobileApp, replaced in Task 5/6.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(mobile): MapScreen (sheet+rail) replaces MobileMapShell"
```

---

### Task 11: `InboxScreen` + `MomentViewer`

**Files:** Create `src/mobile/screens/InboxScreen.jsx`, `src/mobile/overlays/MomentViewer.jsx`, `InboxScreen.test.jsx`

**Interfaces:**
- `InboxScreen({ app, nav, settings })` — port from `docs/design-reference/hpm-inbox.jsx`. Swaps: `window.HP_INBOX` → `app.inboxItems`; `window.HP_SUGGEST` → `suggest` from `../../data.js`. Tabs: **정리 필요** (all real inbox items) + **완료** (count from real placed photos: sum of `spot.photos.length` across `app.regions` trips) — **drop the "흐릿(blurry)" tab** (no real classification). "담기" on a suggested item → `app.placePhotos([{ item, tripId: sug.tripId, spotId: sug.spotId }])` then `nav.toast(\`${sug.spotName}에 담았어요\`)`. No suggestion → `nav.toast` prompting PC. Card tap → `nav.openMomentItem(item)`. Empty list → `hpm-empty` state with `Avatar`.
- `MomentViewer({ spot, startIdx, nav, settings })` — port from `hpm-inbox.jsx`. Real `spot.photos` (real images via `Photo`); reaction via `mobileLines(spot, settings).reaction` (import `mobileLines` from `../screens/TripDetail.jsx`). Pager + thumbnail strip.

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import InboxScreen from "./InboxScreen.jsx";

const app = {
  regions: { domestic: { trips: [] }, intl: { trips: [] } },
  inboxItems: [{ id: "i1", date: "2025-10-13", time: "19:10", lat: 35.1, lng: 129.1, tint: "cool", autoLabel: "광안대교", src: "" }],
  placePhotos: vi.fn().mockResolvedValue(),
};

test("renders inbox items and opens moment on tap", () => {
  const nav = { openMomentItem: vi.fn(), toast: vi.fn() };
  render(<InboxScreen app={app} nav={nav} settings={{ tone: "다정" }} />);
  expect(screen.getByText("광안대교")).toBeInTheDocument();
});

test("empty inbox shows empty state", () => {
  render(<InboxScreen app={{ ...app, inboxItems: [] }} nav={{ toast: vi.fn() }} settings={{}} />);
  expect(screen.getByText(/비었어요|다 정리/)).toBeInTheDocument();
});
```

- [ ] **Step 2–4:** Run→fail, implement both, run→pass.
- [ ] **Step 5: Commit**

```bash
git add src/mobile/screens/InboxScreen.jsx src/mobile/overlays/MomentViewer.jsx src/mobile/screens/InboxScreen.test.jsx
git commit -m "feat(mobile): 정리함 + moment viewer on real inbox"
```

---

### Task 12: `ProfileScreen` + `SettingsScreen` + `CoupleScreen`

**Files:** Create `src/mobile/screens/ProfileScreen.jsx`, `src/mobile/overlays/SettingsScreen.jsx`, `src/mobile/overlays/CoupleScreen.jsx`, `ProfileScreen.test.jsx`, `SettingsScreen.test.jsx`

**Interfaces:**
- `ProfileScreen({ app, nav, settings })` — port from `docs/design-reference/hpm-profile.jsx`. D+N via `dday(settings)` (`../useMobileSettings.js`); stats from real trips; gear → `nav.openSettings`; menu → `nav.openCouple`; alerts toggle → `nav.setSettings({alerts})`.
- `SettingsScreen({ nav, settings })` — port; **7-theme grid is kept** (`HPM_THEMES`), each swatch → `nav.setSettings({theme})`; tone/mapSkin/showChars/alerts via `nav.setSettings`. Drop the "§7 색 방향 탐색안 … Tweaks" note. Class `hpm-full`.
- `CoupleScreen({ nav, settings })` — port; name inputs → `nav.setSettings({nameBara/nameNyong})`; anniversary date → `nav.setSettings({anniv})`; myChar segmented → `nav.setSettings({myChar})`.

- [ ] **Step 1: Failing tests**

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import SettingsScreen from "./SettingsScreen.jsx";

test("theme swatch updates settings", () => {
  const nav = { back: vi.fn(), setSettings: vi.fn(), openCouple: vi.fn() };
  render(<SettingsScreen nav={nav} settings={{ theme: "coral", tone: "다정", mapSkin: "cozy", showChars: true, alerts: true, nameBara: "바라", nameNyong: "뇽이", anniv: null }} />);
  fireEvent.click(screen.getByText(/노을 다크/));
  expect(nav.setSettings).toHaveBeenCalledWith({ theme: "dark" });
});
```

```jsx
import ProfileScreen from "./ProfileScreen.jsx";
test("profile shows couple names and D+N", () => {
  const app = { regions: { domestic: { trips: [] }, intl: { trips: [] } } };
  render(<ProfileScreen app={app} nav={{ openSettings: vi.fn(), openCouple: vi.fn(), setSettings: vi.fn() }} settings={{ nameBara: "바라", nameNyong: "뇽이", anniv: null, mapSkin: "cozy", alerts: true }} />);
  expect(screen.getByText(/바라/)).toBeInTheDocument();
  expect(screen.getByText(/D\+/)).toBeInTheDocument();
});
```

- [ ] **Step 2–4:** Run→fail, implement all three, run→pass.
- [ ] **Step 5: Commit**

```bash
git add src/mobile/screens/ProfileScreen.jsx src/mobile/overlays/SettingsScreen.jsx src/mobile/overlays/CoupleScreen.jsx src/mobile/screens/ProfileScreen.test.jsx src/mobile/overlays/SettingsScreen.test.jsx
git commit -m "feat(mobile): 프로필 + settings (7-theme picker) + couple"
```

---

### Task 13: `JourneyPlayer` (cinematic)

**Files:** Create `src/mobile/overlays/JourneyPlayer.jsx`, `JourneyPlayer.test.jsx`

**Interfaces:** `JourneyPlayer({ trip, nav, settings })` — port from `docs/design-reference/hpm-profile.jsx`. Swaps: `window.HP_ORDERED` → `ordered`; real photos; lines via `mobileLines`; names from `settings`; tiles from `mapUtil.js`. Keep auto-advance (4.6s/scene), play/pause, minimap polyline. Mock `leaflet` in tests (as Task 10).

- [ ] **Step 1: Failing test**

```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("leaflet", () => { /* same stub as Task 10 */ });
import JourneyPlayer from "./JourneyPlayer.jsx";
const trip = { id: "t", title: "부산", days: [{ label: "Day1", date: "10.11", spots: [
  { id: "a", name: "해운대", time: "11:40", lat: 35.1, lng: 129.1, mood: "바다", guide: "안내", reaction: "우와", photos: [{ label: "p", tint: "cool" }] }] }] };
test("shows the first scene place + close works", () => {
  const nav = { back: vi.fn() };
  render(<JourneyPlayer trip={trip} nav={nav} settings={{ tone: "다정", nameBara: "바라", nameNyong: "뇽이", mapSkin: "cozy" }} />);
  expect(screen.getByText("해운대")).toBeInTheDocument();
  fireEvent.click(screen.getByText("✕"));
  expect(nav.back).toHaveBeenCalled();
});
```

- [ ] **Step 2–4:** Run→fail, implement, run→pass.
- [ ] **Step 5: Commit**

```bash
git add src/mobile/overlays/JourneyPlayer.jsx src/mobile/overlays/JourneyPlayer.test.jsx
git commit -m "feat(mobile): cinematic journey player on real data"
```

---

## Phase 4 — Upload

### Task 14: `UploadSheet` (design UI + real pipeline) and retire old upload flow

> **Execution-order override (build-safe):** CREATE `UploadSheet.jsx` + test only (Steps 1–4, then commit just UploadSheet). The `MobileUploadFlow` deletion (Steps 5–6) is DEFERRED to Task 15 — the still-live old `MobileApp` imports it.

**Files:** Create `src/mobile/overlays/UploadSheet.jsx`, `UploadSheet.test.jsx`; Delete `src/mobile/MobileUploadFlow.jsx`; remove its now-unused `hpu-*` CSS only if no longer referenced.

**Interfaces:** `UploadSheet({ app, nav, settings })` — design upload visual (`docs/design-reference/hpm-upload.jsx`: `hpm-overlay`+`hpm-sheet-modal` pick step, `hpm-full` one-by-one confirm) backed by the REAL pipeline ported from `MobileUploadFlow.jsx`:
- pick: real camera-roll/camera `<input type=file>` via the existing `addFiles` logic; selection state.
- reading: `api.uploadPhotos(files, settings.myChar || "bara", setProg)` with a progress bar (`hpm-up-prog`-styled).
- confirm: per item, `suggest(item)` + session-spot nearest match (`nearestSpot` ported) + new-spot naming + GPS-less handling + keep/discard/skip.
- finish: `app.placePhotos(rows)` / new-trip via `buildTripFromGroups` + `api.opAddTrip` / discard via `api.opInboxPurge`; end with `nav.toast(\`${keptN}장 정리 완료\`)` + `nav.close()`.

> This is the highest-risk task — it re-homes working logic into a new UI. Before porting, copy `MobileUploadFlow.jsx`'s helper functions (`nearestSpot`, `addFiles`, `start`, `advance`, `finish`, `commitName`) verbatim into `UploadSheet.jsx`, then re-skin the render. Keep the existing `MobileUploadFlow.test.jsx` assertions (adapt selectors to the new markup) so behavior is pinned.

- [ ] **Step 1: Write failing test (pick → confirm flow, mocked api)**

```jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("../../api.js", async (orig) => ({ ...(await orig()), uploadPhotos: vi.fn().mockResolvedValue({ state: {}, added: [{ id: "x", lat: null, time: "12:00", date: "2025-10-11", autoLabel: "테스트", src: "" }], duplicates: [] }) }));
import UploadSheet from "./UploadSheet.jsx";

test("renders the picker step with the bara prompt", () => {
  const app = { regions: { domestic: { trips: [] }, intl: { trips: [] } }, placePhotos: vi.fn() };
  render(<UploadSheet app={app} nav={{ close: vi.fn(), toast: vi.fn() }} settings={{ myChar: "bara" }} />);
  expect(screen.getByText(/그냥 다 골라줘/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement `UploadSheet.jsx`** (port logic from `MobileUploadFlow.jsx`, re-skin to `hpm-upload.jsx` markup; owner = `settings.myChar || "bara"`).
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Delete old flow**

```bash
git rm src/mobile/MobileUploadFlow.jsx src/mobile/MobileUploadFlow.test.jsx
grep -rn "MobileUploadFlow" src   # expect empty
grep -rn "hpu-" src               # if empty, also remove hpu-* CSS from styles.css
```

- [ ] **Step 6: Run full tests + build** — `npm test -- --run` && `npm run build` → green.
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(mobile): UploadSheet (design UI on real upload pipeline); retire MobileUploadFlow"
```

---

## Phase 5 — Integration & polish

### Task 15: integration — wire `MobileApp` gate, delete old shells, viewport/fonts, verify

> **This is the integration step deferred from Tasks 5/10/14.** Do groups A→B→(C steps below)→D in order; each ends green.
> - **A. Wire MobileApp:** Replace `src/mobile/MobileApp.jsx` with the gate from Task 5 Step 5 (splash → login if `auth.needsLogin` → pick-side if `!settings.myChar` → `MobileShell`); add `src/mobile/MobileApp.test.jsx` from Task 5 Step 6; `npm test -- --run src/mobile/MobileApp.test.jsx` → PASS.
> - **B. Delete old shells:** `git rm src/mobile/MobileMapShell.jsx src/mobile/MobileUploadFlow.jsx src/mobile/MobileUploadFlow.test.jsx`; `grep -rn "MobileMapShell\|MobileUploadFlow" src` → empty. Remove old `MobileMapShell` CSS from `src/styles.css` (`hpm-shell`, `hpm-grabber`, `hpm-tabs`, `hpm-tab-ico`, `hpm-add`, `.hpm-badge`, pre-Task-1 `.hpm-map`/`.hpm-sheet` variants); `grep -rn "hpu-" src` → if empty remove `hpu-*` rules; verify `grep -rn "hpm-shell\|hpm-tabs\|hpm-grabber" src` → empty. Commit `feat(mobile): wire MobileApp gate; remove old MobileMapShell + MobileUploadFlow`.

**Files:** Modify `src/mobile/MobileApp.jsx`, `src/styles.css`, `index.html`; Create `src/mobile/MobileApp.test.jsx`; Delete `src/mobile/MobileMapShell.jsx`, `src/mobile/MobileUploadFlow.jsx`, `src/mobile/MobileUploadFlow.test.jsx`

**Interfaces:** consumes everything from Tasks 2–14.

- [ ] **Step 1: Add `viewport-fit=cover` + fonts to `index.html`**

Set the viewport meta to `width=device-width, initial-scale=1, viewport-fit=cover`. If the Jua / Gowun Dodum / Quicksand fonts are not already loaded, add the `<link href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">` from the design HTML head. (Check first: `grep -n "fonts.googleapis" index.html src/styles.css`.)

- [ ] **Step 2: Manual responsive check at mobile width**

Run: `npm run dev`, open at ≤760px width (or device emulation). Verify: splash → (local: pick-side) → 여정; tab switching; FAB opens UploadSheet; theme change in Settings recolors the app; safe-area padding present.
Expected: flows render with real local data; no console errors.

- [ ] **Step 3: Full test suite + build + diff check**

Run: `npm test -- --run` && `npm run build` && `git diff --check`
Expected: all green, no whitespace errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(mobile): viewport-fit cover + fonts; integration verified"
```

---

## Self-Review

**Spec coverage** (spec §-by-§): §2.1 launch splash → Task 5 ✓; §2.2 splash auto-advance → Task 5 ✓; §2.3 owner→myChar → Tasks 7,12 ✓; §2.4 full app real data → Tasks 9–14 ✓; §2.5 stripped chrome → Task 1 (not ported) ✓; §2.6 7-theme system → Tasks 1,3,6,12 ✓; §2.7 responsive/safe-area/platform → Tasks 1,6,15 ✓; §2.8 upload sheet on real pipeline → Task 14 ✓; §2.9 MapScreen replaces MobileMapShell → Task 10 ✓; §2.11 pick-side → Task 7 ✓; §2.12 login restyled + useAuth seam → Tasks 4,8 ✓; §6 screens → Tasks 9–13 ✓; §7 themes → Tasks 1,12 ✓; §8 responsive → Tasks 1,15 ✓; §9 upload reconstruction → Task 14 ✓; §10 atoms/CSS → Tasks 1,2 ✓; §11 settings store → Task 3 ✓; §12 tests → every task ✓.

**Placeholder scan:** Screen tasks say "port from `<design-reference file>`" rather than re-pasting 100+ lines of design JSX — the exact source files are vendored in Task 1 and the per-task Interfaces block lists every required swap, prop, and helper signature. Foundation/logic tasks (2–8, 14) contain complete code.

**Type consistency:** `nav` shape defined in Task 6 is consumed unchanged in Tasks 9–14. `Photo`/`Avatar`/`Speech`/`Chip`/`Ico` signatures (Task 2) match all usages. `mobileLines(spot, settings)` defined in Task 9, reused in Tasks 11,13. `dday(settings)` defined Task 3, used Tasks 5,12. `useMobileSettings` keys consistent across Tasks 3,6,12. `app.*` (regions, inboxItems, placePhotos, opAddTrip via api, ordered/suggest/autoLine from data.js) match `useHeartPinState`.

**Risk note:** Task 14 (upload) carries the real logic re-home — pin behavior with the adapted `MobileUploadFlow` tests before re-skinning. Tasks 10 & 13 require a `leaflet` mock in jsdom.
