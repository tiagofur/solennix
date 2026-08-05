import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@tests/customRender";
import i18n from "i18next";
import { ManualArticle } from "./ManualArticle";

const renderArticle = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/help/manual/${slug}`]}>
      <Routes>
        <Route path="/help/manual/:slug" element={<ManualArticle />} />
        <Route path="/help/manual" element={<div>manual index</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("ManualArticle", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
    window.localStorage.clear();
  });

  it("renders product article with next/prev navigation", () => {
    renderArticle("crear-producto");

    expect(
      screen.getByRole("heading", { name: "Crear un producto" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Un producto es lo que ofrecés/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Siguiente/i })).toHaveAttribute(
      "href",
      "/help/manual/crear-inventario"
    );
    expect(screen.getByRole("link", { name: /Anterior/i })).toHaveAttribute(
      "href",
      "/help/manual/crear-cliente"
    );
  });

  it("redirects unknown slug to manual index", () => {
    renderArticle("no-existe");
    expect(screen.getByText("manual index")).toBeInTheDocument();
  });
});
