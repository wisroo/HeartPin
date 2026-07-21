# Mobile Trip Map Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (`- [ ]`) for tracking.

**Goal:** Make the Mobile map tab start with an all-trips overview, then open one trip into a full-route map with an `전체`/Day-filtered three-snap bottom sheet.

**Architecture:** Keep tab and overlay navigation in `MobileShell`. Add a small `MobileMapScreen` coordinator that stores selected IDs, split Leaflet rendering into overview and selected-trip components, render the Days interaction in `TripDaysSheet`, and isolate coordinate/grouping calculations in pure `mobileMapModel` helpers. Preserve the Web map and all storage adapters unchanged.

**Tech Stack:** React 19, Leaflet, Vitest, Testing Library, Vite, existing HeartPin Mobile CSS.

## Global Constraints

- Preserve the Web/Mobile shell boundary and do not change Web map behavior.
- Do not change Supabase schema, adapters, uploads, or original-photo handling.
- Keep trips and spots without coordinates visible in lists; never invent coordinates.
- Store selected trip/day/spot IDs instead of copied domain objects.
- Do not add dependencies or claim physical-device validation.
- Run the full repository verification before completion.

### Task 1: Define the Mobile map data contracts

**Files:**
- Create: `src/mobile/screens/map/mobileMapModel.js`
- Create: `src/mobile/screens/map/mobileMapModel.test.js`

- [x] Add failing tests for stable Day IDs, whole-trip sequence numbers, trip centroid/count summaries, and filtering located spots by `전체` or Day.
- [x] Run `npm test -- --run src/mobile/screens/map/mobileMapModel.test.js` and confirm the new tests fail because the model does not exist.
- [x] Implement the smallest pure helpers: `tripDayGroups`, `spotSequence`, `locatedSpots`, and `tripMapSummary`.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Build the all-trips Mobile overview

**Files:**
- Create: `src/mobile/screens/map/MobileMapOverview.jsx`
- Create: `src/mobile/screens/map/MobileMapOverview.test.jsx`
- Modify: `src/styles.css`

- [x] Add failing UI tests proving every trip is listed, zero-location trips remain selectable, and selecting a trip invokes its ID.
- [x] Run the focused overview test and confirm RED.
- [x] Implement the Leaflet overview with one marker per located-trip centroid, default Korea view for no coordinates, fit bounds for available centers, and compact trip cards for all trips.
- [x] Add only the overview marker/card styles required by the component.
- [x] Re-run the focused overview test and confirm GREEN.

### Task 3: Split and extend the selected-trip map and Days sheet

**Files:**
- Create: `src/mobile/screens/map/TripDaysSheet.jsx`
- Create: `src/mobile/screens/map/TripDaysSheet.test.jsx`
- Create: `src/mobile/screens/map/MobileTripMap.jsx`
- Create: `src/mobile/screens/map/MobileTripMap.test.jsx`
- Modify: `src/styles.css`

- [x] Add failing sheet tests for `전체` and Day chips, Day-filtered rails, grouped full-sheet sections, and location-free spot visibility.
- [x] Run the focused sheet test and confirm RED.
- [x] Implement the three-snap sheet using the existing rail/list visual language and explicit Day selection callbacks.
- [x] Add failing selected-trip map tests proving the full route is the default, Day selection changes the visible scope, and active spot selection remains synchronized.
- [x] Run the focused trip-map test and confirm RED.
- [x] Move the existing Leaflet marker/route/character behavior into `MobileTripMap`, omit non-located spots from Leaflet layers, retain them in the sheet, and keep whole-trip numbering stable.
- [x] Add only the Day chip/group/empty-location styles needed by these views.
- [x] Re-run both focused test files and confirm GREEN.

### Task 4: Coordinate overview, direct Journey entry, and back navigation

**Files:**
- Create: `src/mobile/screens/map/MobileMapScreen.jsx`
- Create: `src/mobile/screens/map/MobileMapScreen.test.jsx`
- Modify: `src/mobile/MobileShell.jsx`
- Modify: `src/mobile/MobileShell.test.jsx`
- Delete: `src/mobile/screens/MapScreen.jsx`
- Delete: `src/mobile/screens/MapScreen.test.jsx`

- [x] Add failing coordinator tests for overview-first entry, selecting a trip, direct trip/spot entry, and trip-to-overview back behavior.
- [x] Run the focused coordinator test and confirm RED.
- [x] Implement ID-based coordinator state and render the overview or selected-trip map.
- [x] Update `MobileShell` so tapping the Map tab clears direct-entry state, while `nav.openMap(trip, spotIndex)` supplies the intended trip and spot.
- [x] Update shell tests to prove direct Map-tab overview and Journey shortcut behavior.
- [x] Remove the superseded monolithic `MapScreen` and its obsolete tests.
- [x] Run all Mobile map and shell tests and confirm GREEN.

### Task 5: Verify and review the implementation

**Files:**
- Modify only files needed to correct verified defects.

- [x] Run `npm test -- --run`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Review `git diff` for scope creep, coordinate/privacy behavior, stable IDs, Web shell isolation, and unused code.
- [x] Scan changed files for placeholders with `rg -n "TODO|FIXME|placeholder|not implemented"`.
- [x] At a Mobile viewport, manually verify overview selection, trip Days filtering, sheet expansion, marker/card synchronization, and back navigation in the local browser.
- [x] Record that browser validation is local-only and does not prove physical-device touch behavior.
- [x] Commit only the Mobile map hierarchy files with an English Conventional Commit message.

## Spec Coverage Review

- [x] Direct Map-tab entry shows all trips and never defaults to the first trip.
- [x] Overview marker/card selection opens the intended trip with `전체` selected.
- [x] Journey detail can deep-link to a trip and active spot.
- [x] Day selection changes both the visible cards and Leaflet bounds without borrowing other Days' coordinates.
- [x] Fully expanded sheet groups spots by Day.
- [x] Trips and Days without coordinates remain inspectable.
- [x] Back moves moment → trip map → overview → Journey.
- [x] Web map, Supabase, and upload behavior remain unchanged.
