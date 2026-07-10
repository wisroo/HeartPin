import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect } from "vitest";
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
