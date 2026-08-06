# Mobile Recipient Transfers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mobile/PWA Profile flow that lists waiting partner originals, starts a signed browser download, and records an explicit phone or personal-PC save confirmation.

**Architecture:** A focused `RecipientTransfersScreen` owns transfer loading and interaction state while calling the existing shared `src/api.js` boundary. `ProfileScreen` raises a navigation intent and `MobileShell` owns the overlay stack. Browser anchor creation stays behind one small injectable function so component tests can exercise the real UI without initiating a real download.

**Tech Stack:** React 18, Vite 6, Vitest 4, Testing Library, existing HeartPin `hpm-*` CSS and SVG atoms.

## Global Constraints

- Keep the shared Supabase account and logical owners `bara` and `nyong`.
- Reuse `listIncomingTransfers(owner)`, `createIncomingTransferDownload(transferId, owner)`, and `confirmIncomingTransferSaved(transferId, owner, location)` without changing their contracts.
- Mobile/PWA only; do not add Web shell UI or shared global transfer state.
- A browser download click is not save proof; require explicit user confirmation.
- Delete no Storage object directly from UI code.
- Add no dependency, secret, service-role key, permanent cloud-original retention, or emoji.
- Live Supabase, browser/OS save behavior, and physical-device checks remain Local-only.
- Preserve the two user-owned untracked files in the main checkout.

---

### Task 1: Recipient transfer screen

**Files:**
- Create: `src/mobile/overlays/RecipientTransfersScreen.jsx`
- Create: `src/mobile/overlays/RecipientTransfersScreen.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `owner: "bara" | "nyong"`, `nav.back()`, `nav.toast(message)`, and the three existing shared API operations.
- Produces: `RecipientTransfersScreen({ nav, owner, downloadFile = startBrowserDownload })` and `startBrowserDownload(download, documentRef)`.

- [x] **Step 1: Write failing loading, populated, empty, and retry tests**

Mock only `../../api.js`. Render the real screen with complete transfer fixtures:

```js
const transfer = {
  id: "tr_hash-123",
  contentHash: "hash-123",
  sourceOwner: "bara",
  destinationOwner: "nyong",
  originalName: "summer-river.jpg",
  originalSize: 2483200,
  mimeType: "image/jpeg",
  expiresAt: "2026-08-09T01:00:00.000Z",
  createdAt: "2026-08-06T01:00:00.000Z",
};
```

Assert the loading skeleton appears before the promise resolves, then filename/source/size/expiry and `다운로드` appear. Add separate empty and rejected-load tests; clicking `다시 불러오기` must call the list API again and render the returned fixture.

- [x] **Step 2: Run focused tests to verify RED**

Run:

```bash
npm test -- --run src/mobile/overlays/RecipientTransfersScreen.test.jsx
```

Expected: FAIL because the screen module does not exist.

- [x] **Step 3: Implement browser and display helpers plus read states**

Create these pure boundaries in the new module:

```js
export function startBrowserDownload({ url, filename }, documentRef = document) {
  const anchor = documentRef.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function phoneLocationFor(owner) {
  return owner === "bara" ? "bara_phone" : "nyong_phone";
}
```

Load `api.listIncomingTransfers(owner)` from an effect with an `alive` cleanup guard. Render skeleton rows, inline error/retry, the empty state, or transfer rows. Format size into KB/MB and expiry into hours/days remaining without exposing private paths.

- [x] **Step 4: Run focused read-state tests to verify GREEN**

Run the focused test file and expect all read-state tests to pass.

- [x] **Step 5: Write failing download and confirmation tests**

With an injected `downloadFile` spy, assert:

```js
await user.click(screen.getByRole("button", { name: "summer-river.jpg 다운로드" }));
expect(downloadFile).toHaveBeenCalledWith({
  transferId: "tr_hash-123",
  url: "https://signed.example/summer-river.jpg",
  filename: "summer-river.jpg",
  mimeType: "image/jpeg",
  size: 2483200,
  expiresAt: "2026-08-09T01:00:00.000Z",
});
```

After download initiation, assert `내 폰에 저장 완료` calls confirmation with `nyong_phone`, `개인 PC에 저장 완료` calls it with `personal_pc`, success removes only that row and calls `nav.toast`, and download/confirmation failures stay inline with retry controls. Closing before confirmation must call only `nav.back`.

- [x] **Step 6: Run interaction tests to verify RED**

Expected: FAIL because download and confirmation handlers are absent.

- [x] **Step 7: Implement the minimal interaction state machine**

Keep `readyIds`, one `busyKey`, and per-row error messages in local state. Download must request a fresh signed URL, call `downloadFile`, then add only that transfer ID to `readyIds`. Confirmation must map the explicit location, await the API, remove only the confirmed row, clear its local state, and toast `원본 저장을 확인했어요`.

Do not infer save success, auto-confirm on anchor click, or close the overlay after one success.

- [x] **Step 8: Add scoped CSS and verify GREEN**

Add only `.hpm-receive-*` selectors. Reuse existing theme variables. Include:

- transform/opacity shimmer for list-shaped skeletons;
- readable filename truncation;
- metadata and expiry hierarchy;
- inline error and empty states;
- stacked primary download button;
- two-column confirmation actions that collapse safely on narrow widths;
- disabled and `:active` feedback.

Run:

```bash
npm test -- --run src/mobile/overlays/RecipientTransfersScreen.test.jsx
git diff --check
```

Expected: PASS and no whitespace errors.

- [x] **Step 9: Commit the screen slice**

```bash
git add src/mobile/overlays/RecipientTransfersScreen.jsx src/mobile/overlays/RecipientTransfersScreen.test.jsx src/styles.css
git commit -m "feat(mobile): add recipient transfer screen"
```

---

### Task 2: Profile and shell integration

**Files:**
- Modify: `src/mobile/screens/ProfileScreen.jsx`
- Create: `src/mobile/screens/ProfileScreen.test.jsx`
- Modify: `src/mobile/MobileShell.jsx`
- Modify: `src/mobile/MobileShell.test.jsx`

**Interfaces:**
- Consumes: `nav.openRecipientTransfers()` from Profile and `settings.myChar` from Mobile shell settings.
- Produces: a Profile menu entry and `recipientTransfers` overlay route rendering `RecipientTransfersScreen` with the active owner.

- [x] **Step 1: Write failing Profile behavior test**

Render the real `ProfileScreen` with complete empty app/settings fixtures. Click `받을 원본` and assert `nav.openRecipientTransfers` is called once. The break this catches is a visible row that is disconnected from navigation.

- [x] **Step 2: Run focused Profile test to verify RED**

Run:

```bash
npm test -- --run src/mobile/screens/ProfileScreen.test.jsx
```

Expected: FAIL because the menu entry is absent.

- [x] **Step 3: Add the Profile menu entry**

Place the row first in the existing `.hpm-menu`, using `Ico.inbox`, label `받을 원본`, helper chip `확인하기`, and the existing chevron. Do not fetch data from Profile.

- [x] **Step 4: Run focused Profile test to verify GREEN**

Expected: PASS.

- [x] **Step 5: Write failing Mobile shell overlay test**

Keep `ProfileScreen` real in `MobileShell.test.jsx`, mock only `RecipientTransfersScreen` to expose its `owner`, switch to `프로필`, click `받을 원본`, and assert `받을 원본 화면:nyong` appears for `settings.myChar = "nyong"`. Then exercise the overlay back handler and assert the Profile screen remains.

- [x] **Step 6: Run focused Mobile shell test to verify RED**

Run:

```bash
npm test -- --run src/mobile/MobileShell.test.jsx
```

Expected: FAIL because the navigation method and overlay route are absent.

- [x] **Step 7: Wire the overlay in MobileShell**

Import `RecipientTransfersScreen`, add:

```js
openRecipientTransfers: () => push({ type: "recipientTransfers" }),
```

and render:

```jsx
{o.type === "recipientTransfers" && (
  <RecipientTransfersScreen nav={nav} owner={settings.myChar} />
)}
```

Use the existing overlay stack and `nav.back`; add no global state.

- [x] **Step 8: Run shell and combined Mobile tests to verify GREEN**

```bash
npm test -- --run src/mobile/screens/ProfileScreen.test.jsx src/mobile/MobileShell.test.jsx src/mobile/overlays/RecipientTransfersScreen.test.jsx
```

Expected: PASS.

- [x] **Step 9: Commit the shell slice**

```bash
git add src/mobile/screens/ProfileScreen.jsx src/mobile/screens/ProfileScreen.test.jsx src/mobile/MobileShell.jsx src/mobile/MobileShell.test.jsx
git commit -m "feat(mobile): open recipient transfers from profile"
```

---

### Task 3: Phase status and final verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md`
- Modify: `docs/superpowers/specs/2026-08-06-mobile-recipient-transfers-design.md`
- Modify: `docs/superpowers/plans/2026-08-06-mobile-recipient-transfers.md`

**Interfaces:**
- Consumes: completed Mobile/PWA recipient UI behavior.
- Produces: an accurate Phase 3 status that keeps Web, live Supabase, browser/OS save, and physical-device validation outstanding.

- [x] **Step 1: Update only completed-scope documentation**

Record that Mobile/PWA now exposes Profile → `받을 원본`, waiting-list loading/error/empty states, signed browser download initiation, and explicit phone/PC save confirmation. Do not claim that Web UI, actual file persistence, live Supabase migration/RLS/Storage, Capacitor camera-roll save, or expiry cleanup is complete.

- [x] **Step 2: Run full repository verification**

```bash
npm test -- --run
npm run build
git diff --check
git diff --check origin/main
```

Expected: all commands exit 0.

- [x] **Step 3: Self-review the complete branch**

Review `git diff origin/main...HEAD` plus unstaged documentation. Confirm:

- UI calls only `src/api.js`, never Supabase or Storage directly;
- confirmation cannot happen before an initiated download;
- closing and failures do not confirm or delete;
- owner-to-phone mapping is exact;
- no Web shell, secret, permanent-original policy, or Local-only claim changed;
- only validated API confirmation can trigger relay cleanup.

- [x] **Step 4: Mark the plan complete and commit docs**

```bash
git add README.md docs/ROADMAP.md docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md docs/superpowers/specs/2026-08-06-mobile-recipient-transfers-design.md docs/superpowers/plans/2026-08-06-mobile-recipient-transfers.md
git commit -m "docs: record mobile recipient transfers"
```

- [x] **Step 5: Prepare a Draft PR without merging**

Push `feature/mobile-recipient-transfers` and open a Draft PR targeting `main`. Include automated verification, the browser-save evidence boundary, Local-only steps, and the no-auto-merge gate. Add `codex` and `codex-automation` labels only if they exist.

## Self-Review

- Spec coverage: all loading, empty, error, download, explicit confirmation, success, retry, navigation, and documentation requirements map to a task.
- Placeholder scan: no implementation placeholder, undefined interface, or ambiguous mutation remains.
- Type consistency: the overlay uses the merged API signatures and maps `bara -> bara_phone`, `nyong -> nyong_phone`, and either owner -> `personal_pc`.
- Scope check: Web UI, Capacitor save, scheduled cleanup, and Local-only validation remain separate.
