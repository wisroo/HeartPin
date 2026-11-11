import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { getOriginalStorageSummary } from "../../api.js";
import OriginalStorageScreen from "./OriginalStorageScreen.jsx";

vi.mock("../../api.js", () => ({ getOriginalStorageSummary: vi.fn() }));

it("shows counts while hiding deletion candidates", async () => {
  getOriginalStorageSummary.mockResolvedValue({
    counts: { bara_phone: 1, nyong_phone: 0, personal_pc: 0, vault: 1 },
    candidateHashes: ["hash-a"],
  });
  const app = { regions: {}, inboxItems: [{ content_hash: "hash-a", label: "해운대 원본" }] };
  render(<OriginalStorageScreen app={app} owner="bara" nav={{ back: vi.fn() }} />);
  expect(await screen.findByText("외장하드")).toBeVisible();
  expect(screen.queryByText("해운대 원본")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /삭제 검토/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /삭제/ })).not.toBeInTheDocument();
});
