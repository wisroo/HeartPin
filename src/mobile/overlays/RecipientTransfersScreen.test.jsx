import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api.js";
import RecipientTransfersScreen, { startBrowserDownload } from "./RecipientTransfersScreen.jsx";

vi.mock("../../api.js", () => ({
  listIncomingTransfers: vi.fn(),
  createIncomingTransferDownload: vi.fn(),
  confirmIncomingTransferSaved: vi.fn(),
}));

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

const download = {
  transferId: "tr_hash-123",
  url: "https://signed.example/summer-river.jpg",
  filename: "summer-river.jpg",
  mimeType: "image/jpeg",
  size: 2483200,
  expiresAt: "2026-08-09T01:00:00.000Z",
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function makeNav() {
  return { back: vi.fn(), toast: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(new Date("2026-08-06T01:00:00.000Z").getTime());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RecipientTransfersScreen read states", () => {
  it("shows list-shaped loading before rendering waiting originals", async () => {
    const pending = deferred();
    api.listIncomingTransfers.mockReturnValue(pending.promise);

    render(<RecipientTransfersScreen nav={makeNav()} owner="nyong" />);

    expect(screen.getByRole("status", { name: "받을 원본 불러오는 중" })).toBeInTheDocument();

    await act(async () => pending.resolve([transfer]));

    expect(screen.getByText("summer-river.jpg")).toBeInTheDocument();
    expect(screen.getByText("바라가 보냈어요")).toBeInTheDocument();
    expect(screen.getByText("2.4 MB")).toBeInTheDocument();
    expect(screen.getByText("3일 남음")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "summer-river.jpg 다운로드" })).toBeEnabled();
  });

  it("shows a useful empty state", async () => {
    api.listIncomingTransfers.mockResolvedValue([]);

    render(<RecipientTransfersScreen nav={makeNav()} owner="nyong" />);

    expect(await screen.findByText("기다리는 원본이 없어요")).toBeInTheDocument();
    expect(screen.getByText("파트너가 새 사진을 올리면 여기에 나타나요.")).toBeInTheDocument();
  });

  it("labels a transfer that expired while the screen remained open", async () => {
    api.listIncomingTransfers.mockResolvedValue([
      { ...transfer, expiresAt: "2026-08-06T00:59:59.000Z" },
    ]);

    render(<RecipientTransfersScreen nav={makeNav()} owner="nyong" />);

    expect(await screen.findByText("만료됨")).toBeInTheDocument();
  });

  it("retries a failed list load", async () => {
    api.listIncomingTransfers
      .mockImplementationOnce(() => {
        throw new Error("목록을 불러오지 못했어요");
      })
      .mockResolvedValueOnce([transfer]);

    render(<RecipientTransfersScreen nav={makeNav()} owner="nyong" />);

    expect(await screen.findByText("목록을 불러오지 못했어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("summer-river.jpg")).toBeInTheDocument();
    expect(api.listIncomingTransfers).toHaveBeenCalledTimes(2);
  });
});

describe("RecipientTransfersScreen actions", () => {
  it("starts the signed download and confirms the matching phone location", async () => {
    const nav = makeNav();
    const downloadFile = vi.fn();
    api.listIncomingTransfers.mockResolvedValue([transfer]);
    api.createIncomingTransferDownload.mockResolvedValue(download);
    api.confirmIncomingTransferSaved.mockResolvedValue({
      transferId: transfer.id,
      status: "deleted",
      location: "nyong_phone",
    });
    render(
      <RecipientTransfersScreen nav={nav} owner="nyong" downloadFile={downloadFile} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "summer-river.jpg 다운로드" }));

    await waitFor(() => expect(downloadFile).toHaveBeenCalledWith(download));
    fireEvent.click(screen.getByRole("button", { name: "내 폰에 저장 완료" }));

    await waitFor(() => expect(api.confirmIncomingTransferSaved).toHaveBeenCalledWith(
      "tr_hash-123",
      "nyong",
      "nyong_phone",
    ));
    expect(await screen.findByText("기다리는 원본이 없어요")).toBeInTheDocument();
    expect(nav.toast).toHaveBeenCalledWith("원본 저장을 확인했어요");
  });

  it("confirms a personal PC only after download initiation", async () => {
    api.listIncomingTransfers.mockResolvedValue([transfer]);
    api.createIncomingTransferDownload.mockResolvedValue(download);
    api.confirmIncomingTransferSaved.mockResolvedValue({
      transferId: transfer.id,
      status: "deleted",
      location: "personal_pc",
    });
    render(
      <RecipientTransfersScreen nav={makeNav()} owner="nyong" downloadFile={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "개인 PC에 저장 완료" })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "summer-river.jpg 다운로드" }));
    fireEvent.click(await screen.findByRole("button", { name: "개인 PC에 저장 완료" }));

    await waitFor(() => expect(api.confirmIncomingTransferSaved).toHaveBeenCalledWith(
      "tr_hash-123",
      "nyong",
      "personal_pc",
    ));
  });

  it("maps Bara's phone confirmation to bara_phone", async () => {
    const baraTransfer = {
      ...transfer,
      sourceOwner: "nyong",
      destinationOwner: "bara",
    };
    api.listIncomingTransfers.mockResolvedValue([baraTransfer]);
    api.createIncomingTransferDownload.mockResolvedValue(download);
    api.confirmIncomingTransferSaved.mockResolvedValue({
      transferId: transfer.id,
      status: "deleted",
      location: "bara_phone",
    });
    render(
      <RecipientTransfersScreen nav={makeNav()} owner="bara" downloadFile={vi.fn()} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "summer-river.jpg 다운로드" }));
    fireEvent.click(await screen.findByRole("button", { name: "내 폰에 저장 완료" }));

    await waitFor(() => expect(api.confirmIncomingTransferSaved).toHaveBeenCalledWith(
      "tr_hash-123",
      "bara",
      "bara_phone",
    ));
  });

  it("keeps the transfer retryable when download or confirmation fails", async () => {
    api.listIncomingTransfers
      .mockResolvedValueOnce([transfer])
      .mockResolvedValueOnce([]);
    api.createIncomingTransferDownload
      .mockRejectedValueOnce(new Error("다운로드 URL을 만들지 못했어요"))
      .mockResolvedValue(download);
    api.confirmIncomingTransferSaved.mockRejectedValue(new Error("저장 확인에 실패했어요"));
    render(
      <RecipientTransfersScreen nav={makeNav()} owner="nyong" downloadFile={vi.fn()} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "summer-river.jpg 다운로드" }));
    expect(await screen.findByText("다운로드 URL을 만들지 못했어요")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "summer-river.jpg 다운로드" }));
    fireEvent.click(await screen.findByRole("button", { name: "내 폰에 저장 완료" }));

    expect(await screen.findByText("저장 확인에 실패했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 폰에 저장 완료" })).toBeEnabled();
    expect(screen.getByText("summer-river.jpg")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "목록 새로고침" }));
    expect(await screen.findByText("기다리는 원본이 없어요")).toBeInTheDocument();
    expect(api.listIncomingTransfers).toHaveBeenCalledTimes(2);
  });

  it("closes without confirming an unacknowledged download", async () => {
    const nav = makeNav();
    api.listIncomingTransfers.mockResolvedValue([transfer]);
    render(<RecipientTransfersScreen nav={nav} owner="nyong" />);

    fireEvent.click(screen.getByRole("button", { name: "받을 원본 닫기" }));

    expect(nav.back).toHaveBeenCalledOnce();
    expect(api.confirmIncomingTransferSaved).not.toHaveBeenCalled();
  });
});

it("creates and removes a browser download anchor", () => {
  const click = vi.fn();
  const remove = vi.fn();
  const anchor = { style: {}, click, remove };
  const documentRef = {
    createElement: vi.fn(() => anchor),
    body: { appendChild: vi.fn() },
  };

  startBrowserDownload(download, documentRef);

  expect(anchor).toMatchObject({
    href: download.url,
    download: download.filename,
    rel: "noopener",
    style: { display: "none" },
  });
  expect(documentRef.body.appendChild).toHaveBeenCalledWith(anchor);
  expect(click).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce();
});

it("removes the browser download anchor when click throws", () => {
  const error = new Error("브라우저 다운로드를 시작하지 못했어요");
  const remove = vi.fn();
  const anchor = { style: {}, click: vi.fn(() => { throw error; }), remove };
  const documentRef = {
    createElement: vi.fn(() => anchor),
    body: { appendChild: vi.fn() },
  };

  expect(() => startBrowserDownload(download, documentRef)).toThrow(error);
  expect(remove).toHaveBeenCalledOnce();
});
