import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@tests/customRender";
import { OrganizerCard } from "./OrganizerCard";
import type { PublicOrganizerCard } from "@/services/organizersDirectoryService";

function renderCard(card: Partial<PublicOrganizerCard>) {
  return render(
    <MemoryRouter>
      <OrganizerCard organizer={card as PublicOrganizerCard} />
    </MemoryRouter>,
  );
}

const fullCard: PublicOrganizerCard = {
  slug: "alice-catering",
  business_name: "Alice Catering",
  headline: "Catering premium para bodas y eventos corporativos",
  city: "Mexico City",
  country: "Mexico",
  cover_url: "https://x/cover.png",
  logo_url: null,
  primary_event_types: ["boda", "corporativo"],
  average_rating: 4.8,
  reviews_count: 23,
  is_featured: true,
  response_time: "24h",
};

describe("OrganizerCard", () => {
  it("renders complete card with all fields", () => {
    renderCard(fullCard);
    expect(screen.getByText("Alice Catering")).toBeInTheDocument();
    expect(screen.getByText(/Catering premium/)).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText(/\(23\)/)).toBeInTheDocument();
    expect(screen.getByText(/Mexico/)).toBeInTheDocument();
    expect(screen.getByText("Destacado")).toBeInTheDocument(); // featured badge (ES default)
  });

  it("links to /u/:slug", () => {
    renderCard(fullCard);
    const link = screen.getByRole("link", { name: "Alice Catering" });
    expect(link).toHaveAttribute("href", "/u/alice-catering");
  });

  it("hides rating block when average_rating is null (Free gating)", () => {
    renderCard({ ...fullCard, average_rating: null, reviews_count: null, is_featured: false });
    expect(screen.queryByText("4.8")).not.toBeInTheDocument();
    expect(screen.queryByText(/\(23\)/)).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
  });

  it("hides featured badge when is_featured is false", () => {
    renderCard({ ...fullCard, is_featured: false });
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
  });

  it("renders fallback when no cover and no logo (no broken img)", () => {
    renderCard({ ...fullCard, cover_url: null, logo_url: null, business_name: "CateringMX" });
    // No <img> should render (no cover/logo). The fallback gradient div takes its place.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // Business name still shows in the body.
    expect(screen.getByText("CateringMX")).toBeInTheDocument();
  });

  it("shows no location text when both city and country are null", () => {
    renderCard({ ...fullCard, city: null, country: null });
    // MapPin + location row should not render.
    expect(screen.queryByText(/Mexico/)).not.toBeInTheDocument();
  });

  it("limits event type chips to 3 even if more provided", () => {
    renderCard({
      ...fullCard,
      primary_event_types: ["boda", "corporativo", "xv", "infantil", "banquete"],
    });
    // Boda and Corporativo are translated by the i18n map; xv/infantil appear raw.
    // The 5th (banquete) must NOT be present.
    expect(screen.queryByText("Banquete / Catering")).not.toBeInTheDocument();
  });

  it("uses slug as name when business_name is empty", () => {
    renderCard({ ...fullCard, business_name: "", slug: "fallback-slug" });
    expect(screen.getByRole("link", { name: "fallback-slug" })).toBeInTheDocument();
  });
});
