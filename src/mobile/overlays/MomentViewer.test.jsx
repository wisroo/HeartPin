import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import MomentViewer from "./MomentViewer.jsx";
import { listConfirmedOriginalLocations } from "../../api.js";

vi.mock("../../api.js", () => ({ listConfirmedOriginalLocations: vi.fn() }));

it("updates confirmed locations when paging to another photo", async () => {
  listConfirmedOriginalLocations.mockImplementation(async (hash) => hash === "first" ? ["bara_phone", "personal_pc", "vault"] : []);
  const spot = { name: "해운대", photos: [{ content_hash: "first" }, { content_hash: "second" }] };
  render(<MomentViewer spot={spot} nav={{ back: vi.fn() }} />);
  expect(await screen.findByText("바라 폰")).toBeVisible();
  expect(screen.getByText("개인 PC")).toBeVisible();
  expect(screen.getByText("외장하드")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "다음 사진" }));
  expect(screen.queryByText("바라 폰")).not.toBeInTheDocument();
  expect(await screen.findByText("확인된 위치가 없어요")).toBeVisible();
});
