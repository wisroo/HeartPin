# Phase 3 Mobile Recipient Transfers Design

Date: 2026-08-06
Status: Implemented; awaiting user and Local-only verification

## Goal

Connect the merged recipient-transfer API to the Mobile/PWA shell so the active logical recipient can see waiting originals, start a browser download, and explicitly confirm where a successfully saved file landed.

This slice adds user-visible wiring only. It does not change relay persistence, signed URL creation, save-confirmation transactions, or Storage cleanup rules.

## Entry and Scope

The Profile screen gains one `받을 원본` menu row. It opens a focused full-screen Mobile overlay rather than mixing incoming originals into the existing photo-placement inbox.

Included:

- Mobile/PWA Profile entry;
- full-screen recipient-transfer overlay;
- waiting, loading, empty, error, downloading, confirmation, and success states;
- browser download initiation from the existing signed URL;
- explicit `내 폰` and `개인 PC` confirmation choices;
- mocked component and Mobile shell tests;
- Phase 3 documentation updates.

Excluded:

- Web shell UI;
- automatic browser or operating-system save detection;
- Capacitor camera-roll integration;
- scheduled expiry and failed-cleanup jobs;
- live Supabase, browser permission, and physical-device verification;
- any secret or permanent cloud-original retention.

## Component Boundary

Create `src/mobile/overlays/RecipientTransfersScreen.jsx`. It owns only recipient-transfer presentation and local interaction state. It receives the active logical owner through `settings.myChar` and calls the existing shared API boundary:

```text
listIncomingTransfers(owner)
createIncomingTransferDownload(transferId, owner)
confirmIncomingTransferSaved(transferId, owner, location)
```

`MobileShell` owns overlay navigation. `ProfileScreen` only raises `nav.openRecipientTransfers`; it does not fetch or mutate transfer data.

No transfer state enters `useHeartPinState`, because the list is scoped to this isolated overlay and is not consumed elsewhere.

## Interaction Flow

1. Opening the overlay loads waiting transfers for `settings.myChar`.
2. Loading uses rows shaped like the final list rather than a generic spinner.
3. A load failure stays inline and exposes `다시 불러오기`.
4. An empty result explains that new partner originals will appear automatically after upload.
5. Each waiting row shows original filename, source owner, size, and remaining expiry window.
6. `다운로드` requests a fresh signed URL, creates a temporary browser anchor with the original filename, clicks it, and removes the anchor immediately.
7. Only after download initiation succeeds does the row show explicit save-confirmation choices.
8. `내 폰에 저장 완료` maps `bara` to `bara_phone` and `nyong` to `nyong_phone`.
9. `개인 PC에 저장 완료` maps to `personal_pc`.
10. Confirmation success removes the row and shows the existing Mobile toast. Failure stays inline and keeps both confirmation choices available for retry.

The UI never treats an anchor click as proof that the operating system retained the file. The user must make the explicit confirmation.

## Error and Concurrency Behavior

- A list error does not close the overlay.
- A signed URL or browser-download setup error leaves the transfer waiting and exposes a retry.
- Confirmation buttons are disabled while one confirmation is running.
- A confirmation error preserves the transfer and its selected download state.
- A successful confirmation removes only the matching transfer from local UI state.
- Closing the overlay never calls save confirmation.
- If another client completes the transfer first, the adapter error remains visible and the user can reload the list.

## Visual Design

The overlay reuses the existing `hpm-full`, `hpm-top`, `hpm-view`, `hpm-card`, and `hpm-btn` language. It uses the existing warm accent, compact metadata, one elevated surface per transfer, and existing SVG atoms. No new UI dependency, font, gradient system, emoji, or perpetual animation is added.

New CSS is limited to recipient rows, the skeleton shimmer, inline status/error regions, and a two-action confirmation layout. Motion uses only opacity and transform. Buttons retain a visible pressed state and disabled state.

## Test Strategy

Component tests mock only the external shared API and browser anchor boundary while rendering the real overlay. They cover:

- initial loading followed by a populated list;
- empty and load-error/retry states;
- signed download initiation with the original filename;
- phone and personal-PC confirmation payloads;
- confirmation success removal and toast;
- download and confirmation error recovery;
- close without confirmation.

Mobile shell tests render the real `ProfileScreen` navigation contract and verify the `받을 원본` menu opens the recipient overlay for the active owner.

Cloud-friendly verification remains:

```bash
npm test -- --run
npm run build
git diff --check
```

Live Supabase, actual browser file handling, operating-system persistence, Storage deletion behavior, and physical devices remain Local-only.

## Privacy and Operational Risks

- The original remains private in Supabase until explicit confirmation completes cleanup.
- A browser download click is not proof of persistence; premature user confirmation can still delete the relay original.
- A failed confirmation keeps the item visible and does not claim cleanup succeeded.
- Display/thumb derivatives and record rows are never deletion targets in this UI.
