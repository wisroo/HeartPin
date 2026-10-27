import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import TripPreview from "./TripPreview.jsx";

it("shows the uploaded thumbnail as an image and asks for a spot name", () => {
  const draft = {
    title: "당일 여행",
    region: "domestic",
    dateLabel: "2026.05.31 – 05.31",
    days: [{
      label: "Day 1",
      date: "05.31 일",
      spots: [{ id: "spot-1", name: "장소 1", photos: [{ thumb: "https://example.test/thumb.webp", src: "https://example.test/display.webp", label: "여행 사진" }] }],
    }],
  };

  render(<TripPreview draft={draft} onCancel={() => {}} onSave={() => {}} />);

  expect(screen.getByRole("img", { name: "여행 사진" })).toHaveAttribute("src", "https://example.test/thumb.webp");
  expect(screen.getByText("장소 이름을 직접 입력해 주세요")).toBeInTheDocument();
});
