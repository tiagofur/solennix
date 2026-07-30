import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Lightbox } from "./Lightbox";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k }),
}));

const items = [
  { id: "1", src: "https://example.com/a.jpg", title: "Alpha", caption: "2026-01-01" },
  { id: "2", src: "https://example.com/b.jpg", title: "Beta" },
  { id: "3", src: "https://example.com/c.jpg", title: "Gamma" },
];

describe("Lightbox", () => {
  it("renders the current item image and counter", () => {
    render(
      <Lightbox items={items} index={0} onClose={vi.fn()} onIndexChange={vi.fn()} />,
    );
    expect(screen.getByRole("img", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("navigates next and prev via buttons, calling onIndexChange", () => {
    const onIndexChange = vi.fn();
    render(
      <Lightbox items={items} index={1} onClose={vi.fn()} onIndexChange={onIndexChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("wraps around from last to first on next", () => {
    const onIndexChange = vi.fn();
    render(
      <Lightbox items={items} index={2} onClose={vi.fn()} onIndexChange={onIndexChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("calls onClose on close button", () => {
    const onClose = vi.fn();
    render(
      <Lightbox items={items} index={0} onClose={onClose} onIndexChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
