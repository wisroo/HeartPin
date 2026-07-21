# Mobile Trip Map Hierarchy Design

Date: 2026-07-17
Status: Implemented on `feature/mobile-trip-map-hierarchy`; awaiting user validation

## Goal

Make the Mobile map tab follow the same information hierarchy as the Web map while preserving a mobile-first bottom-sheet interaction:

```text
all trips map
→ select one trip
→ see the trip route and Days sheet
→ filter or inspect a Day
→ open a spot and its photos
```

The map tab must no longer select the first trip automatically. A user should first understand where all trips are, then intentionally enter one trip and inspect its days and spots.

This is a Mobile shell navigation and presentation change. It does not change the Supabase schema, storage adapters, upload behavior, or Web map behavior.

## Current Behavior and Problem

The Web map already has two levels:

1. Overview mode places one marker per trip at the average coordinate of its located spots.
2. Selecting a trip replaces the trip marker with the trip's spot markers and route.

The Mobile map currently has only the second level. `MobileShell` passes `mapTrip || allTrips[0]` to `MapScreen`, so opening the map tab immediately enters an arbitrary trip. `MapScreen` then flattens every day through `ordered(trip)` and presents all spots in one rail. Day labels are visible, but days are not navigable groups.

This creates three user-facing problems:

- there is no all-trips spatial overview;
- the first trip appears selected without user intent;
- a multi-day trip reads as one flat spot sequence instead of a trip containing Days.

## Fixed Product Decisions

- Opening the Mobile map tab shows all trips first.
- Overview mode uses one marker per trip, matching the Web map concept.
- Selecting a trip fits its full route and opens a Days sheet from the bottom.
- The initial trip-detail filter is `전체`, so the complete trip remains visible before narrowing to a day.
- The Days sheet offers `전체`, followed by the trip's days in order.
- Selecting a Day fits and lists only that day's located spots.
- Expanding the sheet fully shows all Days as labeled vertical sections.
- Selecting a spot opens the existing `MomentViewer` flow.
- Back navigation moves from moment to trip map, from trip map to all-trips overview, and from overview to the Journey tab.
- Trips with no located spots remain accessible from the overview list even though they have no map marker.
- Web and Mobile remain independent shells; Mobile does not render the Web right-side panel.

## Considered Approaches

### 1. Split overview, trip map, and Days sheet — selected

Create separate components for the all-trips map, selected-trip map, and bottom sheet. Keep navigation state in one small Mobile map coordinator and keep map calculations in pure helpers.

This adds a few focused files but makes each state independently understandable and testable. It also prevents the current `MapScreen` from becoming a large component with overview, detail, filtering, Leaflet effects, and sheet rendering mixed together.

### 2. Reuse the Web `MapBoard`

The Web component already supports overview and trip modes, so reusing it would reduce Leaflet duplication. Its surrounding behavior, however, assumes the desktop `Rnb`, Web camera padding, and Web marker interaction. Adapting those assumptions inside Mobile would couple the two shells and weaken the existing dual-shell boundary.

Pure map-model helpers may be shared later, but the rendered Mobile map remains separate.

### 3. Add overview conditionals to the current `MapScreen`

This touches fewer files initially, but the component would own two map modes, multiple marker types, trip selection, day filtering, sheet snap state, spot rail state, and moment navigation. The smaller initial diff would create a harder-to-change component. This approach is rejected.

## Architecture

The Mobile map feature is divided into a coordinator, two map views, one sheet, and pure data helpers:

```text
src/mobile/screens/map/
  MobileMapScreen.jsx
  MobileMapOverview.jsx
  MobileTripMap.jsx
  TripDaysSheet.jsx
  mobileMapModel.js
```

### `MobileMapScreen`

Owns navigation state and chooses which map view is active.

```text
mode              overview | trip
selectedTripId    string | null
selectedDayId     string | null
selectedSpotId    string | null
```

It receives the trip collection, existing `nav`, and Mobile settings. It stores IDs rather than duplicate trip or spot objects so refreshed app data remains the source of truth.

### `MobileMapOverview`

Renders all trips on one Leaflet map.

- derive one summary per trip;
- place one marker at the average coordinate of located spots;
- fit the camera to all available trip centers;
- show a compact bottom overview with trip cards;
- keep zero-location trips in the card list without creating fake coordinates;
- selecting either a marker or a card calls `selectTrip(tripId)`.

### `MobileTripMap`

Renders one selected trip.

- display the trip's full located route when `selectedDayId` is null;
- display and fit only the selected Day's located spots when a Day is active;
- keep spot numbering stable within the whole trip;
- synchronize map marker selection with the Days sheet;
- place the existing character marker at the active spot when enabled;
- delegate sheet rendering to `TripDaysSheet`.

### `TripDaysSheet`

Keeps the existing three snap levels but changes their content hierarchy.

- `peek`: trip title, date, Day count, spot count;
- `half`: `전체 · Day 1 · Day 2 ...` chips and the selected scope's horizontal spot rail;
- `full`: vertically grouped Day sections containing spot cards.

When `전체` is active, the half rail includes every spot in trip order and the full view groups them under Day headings. When a Day is active, both views contain only that Day's spots.

### `mobileMapModel.js`

Contains pure calculations with no React or Leaflet dependency:

- `tripMapSummary(trip)` — trip center, located spot count, total spot count, photo count;
- `tripDayGroups(trip)` — ordered Days with stable IDs and ordered spots;
- `locatedSpots(groups, selectedDayId)` — located spots for the current scope;
- `spotSequence(groups)` — stable whole-trip sequence numbers.

These helpers can be shared with Web only after their contracts are proven. This slice does not refactor the existing Web map merely to remove small duplication.

## Navigation and Data Flow

### Direct map-tab entry

1. `MobileShell` selects the `map` tab without assigning a default trip.
2. `MobileMapScreen` starts in `overview` mode.
3. `MobileMapOverview` derives summaries from all domestic and international trips.
4. The map fits all trip centers and the compact overview lists every trip.

### Selecting a trip

1. The user selects a trip marker or card.
2. `MobileMapScreen` stores the trip ID, clears Day and spot selection, and enters `trip` mode.
3. `MobileTripMap` fits the full trip route.
4. `TripDaysSheet` opens at `half` with `전체` selected.

### Entry from Journey detail

`nav.openMap(trip, spotIndex)` enters `trip` mode directly for that trip. The map still defaults to `전체`, while the supplied spot becomes active. This preserves the existing shortcut without making direct map-tab entry skip overview.

### Selecting a Day or spot

Selecting a Day updates only `selectedDayId` and camera bounds. Selecting a spot updates the active marker and sheet position. Selecting the already-active spot opens `MomentViewer` through the existing navigation callback.

## Empty and Partial-Location States

- No trips: show the existing empty-state language and an upload action; do not initialize fake markers.
- Trips exist but none have located spots: show the trip list over the default Korea view.
- A selected trip has no located spots: show its Days and spot cards without a route and explain that map pins require location data.
- A Day has no located spots: keep the Day selectable and show its cards; do not reuse another Day's bounds.
- A spot without coordinates remains in the sheet but is omitted from Leaflet layers.

## Component and Shell Boundaries

- `MobileShell` owns only tab and overlay navigation; it does not calculate markers or Days.
- Mobile map components read already-loaded trip data and make no API calls.
- `MomentViewer` remains the photo-detail surface.
- `MapBoard`, `MapShell`, and `Rnb` remain unchanged in the Web shell.
- No new dependency is introduced; Leaflet remains the map implementation.
- No Supabase table, Storage policy, or adapter interface changes are required.

## Testing

Focused Mobile tests must prove visible behavior rather than Leaflet implementation details:

- direct Map-tab entry renders one selectable item per trip and does not auto-enter the first trip;
- marker/card selection enters the intended trip and shows `전체` plus its Day chips;
- Journey-detail entry opens the correct trip directly;
- selecting a Day limits the visible spot cards to that Day;
- full sheet renders spots under Day headings;
- back from trip detail returns to overview before leaving the map tab;
- zero-location trips remain selectable from the overview list;
- zero-location Days do not borrow another Day's map bounds;
- Web shell tests continue to pass unchanged.

Leaflet is mocked at the component boundary. `mobileMapModel.js` receives direct pure-function tests for centroids, Day grouping, location filtering, and stable spot sequence numbers.

Full verification remains:

```bash
npm test -- --run
npm run build
git diff --check
```

Manual browser verification covers Mobile viewport sheet animation, map camera movement, marker/card synchronization, and touch scrolling. Automated checks must not claim those visual interactions were verified on a physical device.

## Route Stroke Amendment

The selected-trip route uses the same soft visual language as the Web map instead of a heavy straight solid line.

Considered approaches:

1. Reuse the shared `smooth()` Catmull-Rom helper and draw one rounded dotted stroke — selected because it aligns Web and Mobile with the smallest change.
2. Keep straight segments and change only dash/cap styling — simpler, but sharp corners still read as mechanical connectors.
3. Layer multiple jittered strokes for a hand-drawn effect — rejected because it reduces map clarity and adds unnecessary rendering complexity.

The Mobile route passes three-or-more points through `smooth(route, 16)`. A two-point route stays a straight segment because there is no intermediate direction from which to derive a meaningful curve. Leaflet renders the result with the existing warm route color, `weight: 2.5`, `opacity: 0.38`, `dashArray: "1 10"`, `lineCap: "round"`, and `lineJoin: "round"`. This produces separated round ink dots along a soft curve without adding a second layer or a new dependency.

Focused tests assert both the smoothed coordinates and the stroke options. Local Mobile browser validation checks that the route remains visible over tiles without overpowering markers. Physical-device display and touch behavior remain Local-only.

## Scope

Included:

- all-trips Mobile map overview;
- explicit trip selection;
- selected-trip full route;
- Days filter and grouped sheet;
- spot and existing moment navigation;
- focused tests and Mobile map styles.

Excluded:

- recipient-original download UI;
- Supabase schema simplification;
- upload grouping changes;
- automatic semantic zoom navigation, rolled back after user validation failed;
- Web map redesign;
- native camera-roll features;
- new clustering libraries;
- live-device or browser-permission claims.

Those excluded items remain separate roadmap slices and must not be bundled into this Mobile map change.
