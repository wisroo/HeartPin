# Map Route and Semantic Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Mobile trip route as a soft rounded dotted curve and return both Mobile and Web selected-trip maps to the all-trips overview after an explicit user zoom-out reaches zoom level 8 or lower.

**Architecture:** Add a small shared Leaflet gesture binder that distinguishes user zoom intent from programmatic camera changes and applies one threshold to both shells. Mobile keeps selection state in `MobileMapScreen`; Web keeps it in `useHeartPinState`; map components only observe Leaflet and call existing overview callbacks.

**Tech Stack:** React 19, Leaflet, Vitest, Testing Library, Vite.

**Status (2026-07-17):** Implementation commit `93dd4fd` exists, but user validation failed on both Web and Mobile. Semantic zoom-out remains an open bug and this plan is not complete.

## Open Bug: Selected trip does not return to the trips overview

- **Reported:** 2026-07-17, after commit `93dd4fd`.
- **Affected surfaces:** Web map and Mobile map.
- **Reproduction:** Open the all-trips map, select one trip, then zoom out repeatedly with the map's normal zoom interaction.
- **Expected:** At Leaflet zoom level 8 or lower, the selected-trip view returns to the all-trips overview.
- **Actual:** The selected-trip view remains open on both Web and Mobile in the user's local browser.
- **Current evidence:** Unit/integration tests pass and one automated browser-control path transitioned successfully, but that path does not represent the user's failing interaction reliably enough to close the bug.
- **Temporary workaround:** Use the explicit back/`전체 여정` navigation instead of relying on zoom-out.
- **Next investigation:** Reproduce the exact user gesture path, capture real Leaflet `zoomstart`/`zoomend` values and DOM input events, and add a regression test for the confirmed runtime failure before changing implementation again.

## Global Constraints

- Use zoom level 8 as the cross-shell overview threshold.
- Arm automatic overview only from wheel/trackpad, two-finger touch, or the Web zoom-out control.
- Never transition from `fitBounds`, `setView`, initial camera setup, or Day-filter camera changes.
- Keep Mobile and Web selection state in their existing coordinators.
- Render the Mobile route with `smooth(route, 16)`, `weight: 2.5`, `opacity: 0.38`, `dashArray: "1 10"`, `lineCap: "round"`, and `lineJoin: "round"`.
- Do not change Supabase, upload, photo storage, or native-device behavior.

---

### Task 1: Shared semantic zoom intent

**Files:**
- Create: `src/mapSemanticZoom.js`
- Create: `src/mapSemanticZoom.test.js`

**Interfaces:**
- Produces: `bindSemanticZoomOut(map, onOverview)` returning a cleanup function.
- Consumes: Leaflet map methods `getContainer()`, `getZoom()`, `on()`, and `off()`.

- [x] **Step 1: Write failing tests** proving an unarmed `zoomend` is ignored, wheel plus zoom 8 calls the callback, zoom 9 stays in trip mode, two-finger touch arms the callback, a one-finger touch does not, and cleanup removes listeners.
- [x] **Step 2: Run RED** with `npm test -- --run src/mapSemanticZoom.test.js`; expect module-resolution failure before the helper exists.
- [x] **Step 3: Implement the helper** with a short-lived user-intent flag, exact threshold 8, DOM listeners for `wheel`, `touchstart`, and zoom-out-control `click`, plus one Leaflet `zoomend` listener.
- [x] **Step 4: Run GREEN** with `npm test -- --run src/mapSemanticZoom.test.js`; expect all helper tests to pass.

### Task 2: Mobile curved route and overview callback

**Files:**
- Modify: `src/mobile/screens/map/MobileTripMap.jsx`
- Modify: `src/mobile/screens/map/MobileTripMap.test.jsx`
- Modify: `src/mobile/screens/map/MobileMapScreen.jsx`
- Modify: `src/mobile/screens/map/MobileMapScreen.test.jsx`

**Interfaces:**
- Consumes: `smooth(points, 16)` and `bindSemanticZoomOut(map, onOverview)`.
- Produces: `MobileTripMap` prop `onZoomOutToOverview`.

- [x] **Step 1: Add failing route tests** asserting Leaflet receives smoothed coordinates and exactly the approved rounded dotted stroke options.
- [x] **Step 2: Add failing navigation tests** asserting `MobileMapScreen` passes its trip-to-overview callback and simulated semantic zoom returns to the overview.
- [x] **Step 3: Run RED** with `npm test -- --run src/mobile/screens/map/MobileTripMap.test.jsx src/mobile/screens/map/MobileMapScreen.test.jsx`; expect missing options/callback assertions to fail.
- [x] **Step 4: Implement the minimal Mobile changes** by importing `smooth`, binding semantic zoom while a trip map is mounted, and passing `backToOverview` from the coordinator.
- [x] **Step 5: Run GREEN** with the same focused command; expect all Mobile map tests to pass.

### Task 3: Web overview callback

**Files:**
- Modify: `src/components/MapBoard.jsx`
- Create: `src/components/MapBoard.test.jsx`
- Modify: `src/features/map/MapShell.jsx`
- Create: `src/features/map/MapShell.test.jsx`

**Interfaces:**
- Consumes: `bindSemanticZoomOut(map, onOverview)`.
- Produces: `MapBoard` prop `onZoomOutToOverview`; `MapShell` supplies `app.back`.

- [x] **Step 1: Add failing Web tests** asserting trip-mode `MapBoard` binds the supplied overview callback and `MapShell` passes `app.back` to `MapBoard`.
- [x] **Step 2: Run RED** with `npm test -- --run src/components/MapBoard.test.jsx src/features/map/MapShell.test.jsx`; expect callback-binding assertions to fail.
- [x] **Step 3: Implement the minimal Web wiring** without changing markers, RNB behavior, or Web route styling.
- [x] **Step 4: Run GREEN** with the same focused command; expect all Web map tests to pass.

### Task 4: Verification and user-visible check

**Files:**
- Modify only files needed to correct verified defects.

- [x] **Step 1: Run** `npm test -- --run`; expect zero failures.
- [x] **Step 2: Run** `npm run build`; expect a successful Vite production build.
- [x] **Step 3: Run** `git diff --check`; expect no output.
- [x] **Step 4: Review** the final diff for listener cleanup, duplicate transitions, Web/Mobile shell isolation, and unrelated changes.
- [ ] **Step 5: Revalidate locally** at Mobile and Web widths. Reopened after the user reported that both surfaces remain in trip detail when zooming out.
- [x] **Step 6: Record** that physical-device pinch behavior remains Local-only, then commit the scoped change with an English Conventional Commit message.
