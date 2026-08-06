import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ProfileScreen from "./ProfileScreen.jsx";

const app = {
  regions: {
    domestic: { trips: [] },
    intl: { trips: [] },
  },
};

test("profile shows couple names and D+N", () => {
  render(
    <ProfileScreen
      app={app}
      nav={{
        openRecipientTransfers: vi.fn(),
        openCouple: vi.fn(),
        openSettings: vi.fn(),
        setSettings: vi.fn(),
      }}
      settings={{
        nameBara: "바라",
        nameNyong: "뇽이",
        anniv: null,
        mapSkin: "cozy",
        alerts: true,
      }}
    />,
  );

  expect(screen.getByText(/바라/)).toBeInTheDocument();
  expect(screen.getByText(/D\+/)).toBeInTheDocument();
});

test("opens the recipient transfer flow from Profile", () => {
  const nav = {
    openRecipientTransfers: vi.fn(),
    openCouple: vi.fn(),
    openSettings: vi.fn(),
    setSettings: vi.fn(),
  };
  const settings = {
    myChar: "nyong",
    nameBara: "바라",
    nameNyong: "뇽이",
    mapSkin: "cozy",
    alerts: true,
    anniv: "2024-06-29",
  };

  render(<ProfileScreen app={app} nav={nav} settings={settings} />);
  fireEvent.click(screen.getByRole("button", { name: /받을 원본/ }));

  expect(nav.openRecipientTransfers).toHaveBeenCalledOnce();
});
