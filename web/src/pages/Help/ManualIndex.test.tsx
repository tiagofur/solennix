import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@tests/customRender";
import i18n from "i18next";
import { ManualIndex } from "./ManualIndex";
import userEvent from "@testing-library/user-event";

const renderManual = () =>
  render(
    <MemoryRouter>
      <ManualIndex />
    </MemoryRouter>
  );

describe("ManualIndex", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
    window.localStorage.clear();
  });

  it("renders journey title and all steps", () => {
    renderManual();

    expect(screen.getByText("Manual de uso")).toBeInTheDocument();
    expect(
      screen.getByText("De cero a tu primera cotización")
    ).toBeInTheDocument();
    expect(screen.getByText("Crear un producto")).toBeInTheDocument();
    expect(screen.getByText("Crear un ítem de inventario")).toBeInTheDocument();
    expect(screen.getByText("Registrar un pago")).toBeInTheDocument();
    expect(screen.getByText("Portal del cliente")).toBeInTheDocument();
    expect(screen.getByText("Checklist del evento")).toBeInTheDocument();
    expect(screen.getByText("Cobros y operación")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Crear un cliente/i })
    ).toHaveAttribute("href", "/help/manual/crear-cliente");
  });

  it("persists platform selection", async () => {
    const user = userEvent.setup();
    renderManual();

    await user.click(screen.getByRole("tab", { name: /iOS/i }));
    expect(window.localStorage.getItem("solennix.manual.platform")).toBe("ios");
  });
});
