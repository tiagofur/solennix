import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@tests/customRender";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PublicProfilePage } from "./PublicProfilePage";
import {
  publicProfileService,
  PublicProfileNotFoundError,
} from "@/services/publicProfileService";

vi.mock("@/services/publicProfileService", () => ({
  PublicProfileNotFoundError: class PublicProfileNotFoundError extends Error {
    constructor(message = "Profile not found") {
      super(message);
      this.name = "PublicProfileNotFoundError";
    }
  },
  publicProfileService: {
    getBySlug: vi.fn(),
  },
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.name) return `${key}:${opts.name}`;
      if (opts?.location) return `${key}:${opts.location}`;
      return key;
    },
    i18n: { language: "en" },
  }),
}));

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/u/${slug}`]}>
      <Routes>
        <Route path="/u/:slug" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = "";
  });

  it("renders happy path: header, contact, services with price, reviews, portfolio", async () => {
    vi.mocked(publicProfileService.getBySlug).mockResolvedValue({
      slug: "alice",
      business_name: "Alice Events",
      headline: "Unforgettable weddings",
      logo_url: "https://cdn.example/logo.png",
      location: { city: "Lisbon", region: null, country: "Portugal" },
      contact: { type: "email", value: "hello@alice.test" },
      services: [
        {
          id: "s1",
          name: "Full package",
          category: "wedding",
          base_price: 1500,
        },
      ],
      reviews: [
        {
          rating: 5,
          comment: "Amazing",
          submitted_at: "2026-01-15T12:00:00Z",
          display_name: "A.",
          event_label: "Wedding",
        },
      ],
      portfolio: [
        {
          id: "p1",
          title: "Garden wedding",
          photo_url: "https://cdn.example/photo.jpg",
          sort_order: 0,
        },
      ],
      socials: { instagram: "https://instagram.com/alice" },
    });

    renderAt("alice");

    await waitFor(() => {
      expect(publicProfileService.getBySlug).toHaveBeenCalledWith(
        "alice",
        expect.any(AbortSignal),
      );
    });

    expect(await screen.findByRole("heading", { name: "Alice Events" })).toBeInTheDocument();
    expect(screen.getByText("Unforgettable weddings")).toBeInTheDocument();
    expect(screen.getAllByText(/Lisbon/).length).toBeGreaterThan(0);
    expect(screen.getByText("Full package")).toBeInTheDocument();
    expect(screen.getByText("Amazing")).toBeInTheDocument();
    // "A." now appears in both the featured testimonial and the reviews list.
    expect(screen.getAllByText("A.").length).toBeGreaterThan(0);
    expect(screen.getByText("Garden wedding")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /profile\.contact_cta|Contact/i }),
    ).toHaveAttribute("href", "mailto:hello@alice.test");
    expect(document.title).toMatch(/Alice Events/);
  });

  it("shows not-found UX when profile is missing or disabled", async () => {
    vi.mocked(publicProfileService.getBySlug).mockRejectedValue(
      new PublicProfileNotFoundError(),
    );

    renderAt("ghost");

    expect(
      await screen.findByRole("heading", {
        name: /profile\.not_found_title|not found|unavailable/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alice Events")).not.toBeInTheDocument();
  });

  it("omits empty sections when data is absent", async () => {
    vi.mocked(publicProfileService.getBySlug).mockResolvedValue({
      slug: "basic",
      business_name: "Basic Co",
      // no services, reviews, portfolio, contact, socials
    });

    renderAt("basic");

    expect(
      await screen.findByRole("heading", { name: "Basic Co" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("profile.services_title")).not.toBeInTheDocument();
    expect(screen.queryByText("profile.reviews_title")).not.toBeInTheDocument();
    expect(screen.queryByText("profile.portfolio_title")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /profile\.contact_cta/i }),
    ).not.toBeInTheDocument();
  });
});
