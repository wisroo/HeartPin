import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect } from "vitest";
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
