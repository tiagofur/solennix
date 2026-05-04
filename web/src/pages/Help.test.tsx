import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@tests/customRender";
import i18n from "i18next";
import { Help } from "./Help";

const renderHelp = () =>
  render(
    <MemoryRouter>
      <Help />
    </MemoryRouter>
  );

describe("Help", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("renders Spanish copy and changelog link", () => {
    renderHelp();

    expect(screen.getByText("Centro de Ayuda")).toBeInTheDocument();
    expect(screen.getByText("Changelog — Qué hay de nuevo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver Changelog/i })).toHaveAttribute(
      "href",
      "/changelog"
    );
  });

  it("renders English copy and changelog link", async () => {
    await i18n.changeLanguage("en");
    renderHelp();

    expect(screen.getByText("Help Center")).toBeInTheDocument();
    expect(screen.getByText("Changelog — What's New")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Changelog/i })).toHaveAttribute(
      "href",
      "/changelog"
    );
  });
});
