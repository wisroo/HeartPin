import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import * as api from "../api.js";
import WebApp from "./WebApp.jsx";
import WebRecipientTransfers from "./WebRecipientTransfers.jsx";

vi.mock("../api.js", () => ({
  getOwner: () => null,
  getApiMode: vi.fn(),
  listIncomingTransfers: vi.fn(),
  createIncomingTransferDownload: vi.fn(),
  confirmIncomingTransferSaved: vi.fn(),
}));

it("checks the selected recipient queue and confirms PC storage only after download starts", async () => {
  api.listIncomingTransfers.mockResolvedValue([{ id: "transfer-1", originalName: "fixture.jpg", sourceOwner: "bara" }]);
  api.createIncomingTransferDownload.mockResolvedValue({ url: "https://fixture.test/file", filename: "fixture.jpg" });
  api.confirmIncomingTransferSaved.mockResolvedValue({});
  const downloadFile = vi.fn();
  render(<WebRecipientTransfers downloadFile={downloadFile} />);
  expect(api.listIncomingTransfers).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("받는 사람"), { target: { value: "nyong" } });
  const download = await screen.findByRole("button", { name: "fixture.jpg 다운로드" });
  expect(api.listIncomingTransfers).toHaveBeenCalledWith("nyong");
  expect(screen.queryByText("개인 PC에 저장 완료")).not.toBeInTheDocument();
  fireEvent.click(download);
  const confirm = await screen.findByText("개인 PC에 저장 완료");
  expect(screen.queryByText("내 폰에 저장 완료")).not.toBeInTheDocument();
  fireEvent.click(confirm);
  expect(await screen.findByText("원본 저장을 확인했어요")).toBeInTheDocument();
  expect(downloadFile).toHaveBeenCalledOnce();
  expect(api.confirmIncomingTransferSaved).toHaveBeenCalledWith("transfer-1", "nyong", "personal_pc");
});

it("offers the transfer dialog on the Supabase Web home only", () => {
  const app = {
    screen: "home",
    region: "domestic",
    regions: { domestic: { key: "domestic", label: "국내", trips: [] } },
    trips: [],
    inboxItems: [],
  };
  api.getApiMode.mockReturnValue("local");
  const { container, rerender } = render(<WebApp app={app} />);
  expect(screen.queryByRole("button", { name: "받을 원본" })).not.toBeInTheDocument();

  api.getApiMode.mockReturnValue("supabase");
  rerender(<WebApp app={app} />);
  const dialog = container.querySelector("dialog");
  dialog.showModal = () => dialog.setAttribute("open", "");
  dialog.close = () => {
    dialog.removeAttribute("open");
    fireEvent(dialog, new Event("close"));
  };
  fireEvent.click(screen.getByRole("button", { name: "받을 원본" }));
  expect(screen.getByRole("dialog", { name: "받을 원본" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
