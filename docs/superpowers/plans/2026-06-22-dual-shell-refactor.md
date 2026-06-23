# Dual Shell Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the plan with the latest `main`, then add tests that protect the already-implemented Web/Mobile shell split.

**Architecture:** The latest `main` already split the app into `src/core/useHeartPinState.js`, `src/core/useResponsiveMode.js`, `src/web/WebApp.jsx`, `src/mobile/MobileApp.jsx`, and map shells. This plan no longer re-extracts `App.jsx`; it verifies and protects the current boundary with focused tests.

**Tech Stack:** React 18, Vite 6, Vitest, Testing Library React, jsdom.

## Global Constraints

- Keep one repository; do not create separate web/mobile repos.
- Preserve the current `src/core`, `src/web`, `src/mobile`, and `src/features/map` structure from latest `main`.
- Do not rewrite shell behavior in this task.
- Add tests before changing test-targeted production code.
- Do not introduce Capacitor yet.
- Preserve LocalServerAdapter and Supabase adapter files.
- Preserve existing local `vite.config.js` server port/preview changes while adding test config.

---

## Current Structure

Already implemented on `main`:

- `src/App.jsx`: app root, responsive shell selection, global modals.
- `src/core/useHeartPinState.js`: shared state, server polling, mutations, navigation actions.
- `src/core/useResponsiveMode.js`: viewport mode detection.
- `src/web/WebApp.jsx`: desktop shell.
- `src/web/WebMapShell.jsx`: desktop map shell wrapper.
- `src/mobile/MobileApp.jsx`: mobile shell.
- `src/mobile/MobileMapShell.jsx`: mobile map, bottom sheet, and tab navigation.
- `src/features/map/MapShell.jsx`: shared map/Rnb shell used by web.

Out of scope for this pass:

- Moving feature components out of `src/components`.
- Adding Capacitor.
- Replacing the LocalServerAdapter.
- Redesigning the mobile bottom tab or bottom sheet.

---

### Task 1: Add Minimal Test Harness

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `src/test/setup.jsx`

**Interfaces:**
- Produces: `npm test -- --run`.
- Produces: jsdom test environment.

- [ ] **Step 1: Install test dependencies**

Run:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Configure scripts and jsdom**

Add `"test": "vitest"` to `package.json`.

Add this block to `vite.config.js` while preserving current `server` and `preview` settings:

```js
test: {
  environment: "jsdom",
  setupFiles: ["./src/test/setup.jsx"],
},
```

Create `src/test/setup.jsx`:

```jsx
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Verify the empty harness**

Run:

```bash
npm test -- --run
```

Expected: Vitest exits successfully with no test files, or reports no tests found without app code failures.

---

### Task 2: Test Responsive Mode Detection

**Files:**
- Create: `src/core/useResponsiveMode.test.jsx`

**Interfaces:**
- Consumes: `useResponsiveMode()` from `src/core/useResponsiveMode.js`.
- Verifies: returns `"web"` for desktop matchMedia and `"mobile"` for mobile matchMedia.

- [ ] **Step 1: Write tests first**

Create `src/core/useResponsiveMode.test.jsx`:

```jsx
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResponsiveMode } from "./useResponsiveMode.js";

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("useResponsiveMode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns web when the mobile media query does not match", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useResponsiveMode());

    expect(result.current).toBe("web");
  });

  it("returns mobile when the mobile media query matches", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useResponsiveMode());

    expect(result.current).toBe("mobile");
  });
});
```

- [ ] **Step 2: Run the test**

Run:

```bash
npm test -- --run src/core/useResponsiveMode.test.jsx
```

Expected: PASS. The implementation already exists on latest `main`.

---

### Task 3: Test Shell Selection In App Root

**Files:**
- Create: `src/App.test.jsx`

**Interfaces:**
- Consumes: `App` from `src/App.jsx`.
- Mocks: `useHeartPinState`, `useResponsiveMode`, `WebApp`, `MobileApp`.
- Verifies: App renders `WebApp` in web mode and `MobileApp` in mobile mode after data is available.

- [ ] **Step 1: Write shell selection tests**

Create `src/App.test.jsx`:

```jsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { useHeartPinState } from "./core/useHeartPinState.js";
import { useResponsiveMode } from "./core/useResponsiveMode.js";

vi.mock("./core/useHeartPinState.js", () => ({
  useHeartPinState: vi.fn(),
}));

vi.mock("./core/useResponsiveMode.js", () => ({
  useResponsiveMode: vi.fn(),
}));

vi.mock("./web/WebApp.jsx", () => ({
  default: () => <div data-testid="web-app">web shell</div>,
}));

vi.mock("./mobile/MobileApp.jsx", () => ({
  default: () => <div data-testid="mobile-app">mobile shell</div>,
}));

vi.mock("./components/Journey.jsx", () => ({
  default: () => <div data-testid="journey" />,
}));

vi.mock("./components/Inbox.jsx", () => ({
  default: () => <div data-testid="inbox" />,
}));

vi.mock("./components/Upload.jsx", () => ({
  default: () => <div data-testid="upload" />,
}));

vi.mock("./components/TripPreview.jsx", () => ({
  default: () => <div data-testid="trip-preview" />,
}));

const appState = {
  data: { version: 1 },
  loadError: null,
  journeyOpen: false,
  trip: null,
  inboxOpen: false,
  uploadOpen: false,
  uploadMode: "inbox",
  newTripDraft: null,
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHeartPinState.mockReturnValue(appState);
  });

  it("renders the web shell in web mode", () => {
    useResponsiveMode.mockReturnValue("web");

    render(<App />);

    expect(screen.getByTestId("web-app")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-app")).not.toBeInTheDocument();
  });

  it("renders the mobile shell in mobile mode", () => {
    useResponsiveMode.mockReturnValue("mobile");

    render(<App />);

    expect(screen.getByTestId("mobile-app")).toBeInTheDocument();
    expect(screen.queryByTestId("web-app")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

Run:

```bash
npm test -- --run src/App.test.jsx
```

Expected: PASS.

---

### Task 4: Verify All Checks

**Files:**
- No new files.

**Interfaces:**
- Verifies: tests and build are healthy after adding the harness.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build exits 0.

- [ ] **Step 3: Check diff cleanliness**

Run:

```bash
git diff --check
```

Expected: exits 0.

---

## Self-Review

Spec coverage:

- Latest `main` structure is preserved.
- Web/Mobile split is verified rather than reimplemented.
- Tests protect shell selection and responsive mode.
- Local adapter and Supabase prep are untouched.

Placeholder scan:

- No placeholder implementation steps remain.

Type consistency:

- Test imports match actual files on latest `main`.
- The plan uses `useHeartPinState`, not the earlier draft name `useHeartPinAppState`.
