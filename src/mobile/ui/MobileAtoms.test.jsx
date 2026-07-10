import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Photo, Avatar, Speech, Ico } from "./MobileAtoms.jsx";

test("Photo shows caption when no src", () => {
  render(<Photo photo={{ label: "해운대", tint: "warm" }} />);
  expect(screen.getByText("해운대")).toBeInTheDocument();
});

test("Photo renders real image (no caption) when src present", () => {
  const { container } = render(<Photo photo={{ src: "http://x/a.jpg", label: "x", tint: "cool" }} />);
  expect(screen.queryByText("x")).toBeNull();
  expect(container.querySelector(".hpm-photo")).toHaveStyle({ backgroundImage: "url(http://x/a.jpg)" });
});

test("Avatar renders the character image", () => {
  render(<Avatar who="bara" size={40} />);
  expect(screen.getByRole("img")).toHaveAttribute("src");
});

test("Ico.journey renders an svg", () => {
  const { container } = render(<Ico.journey />);
  expect(container.querySelector("svg")).toBeInTheDocument();
});
