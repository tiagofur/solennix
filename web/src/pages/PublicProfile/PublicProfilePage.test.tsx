import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@tests/customRender";
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
      if (typeof opts?.defaultValue === "string") {
        return opts.defaultValue.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
          String(opts?.[k] ?? ""),
        );
      }
      if (opts?.name) return `${key}:${opts.name}`;
      if (opts?.location) return `${key}:${opts.location}`;
      if (opts?.title) return `${key}:${opts.title}`;
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
    expect(screen.getByTestId("public-profile-sticky-cta")).toBeInTheDocument();
    expect(screen.getByTestId("sticky-request-quote-button")).toBeInTheDocument();
  });

  it("shows WhatsApp CTAs and package request when contact is whatsapp", async () => {
    vi.mocked(publicProfileService.getBySlug).mockResolvedValue({
      slug: "wa-biz",
      business_name: "WA Events",
      contact: { type: "whatsapp", value: "+5215512345678" },
      packages: [
        {
          id: "pkg-1",
          title: "Gold package",
          description: "Full day",
          from_price: 5000,
          inclusions: ["Setup"],
          is_featured: true,
          sort_order: 0,
        },
      ],
    });

    renderAt("wa-biz");

    expect(
      await screen.findByRole("heading", { name: "WA Events" }),
    ).toBeInTheDocument();

    const waHero = screen.getByTestId("public-whatsapp-button");
    expect(waHero).toHaveAttribute(
      "href",
      expect.stringMatching(/wa\.me\/5215512345678/),
    );
    expect(screen.getByTestId("sticky-whatsapp-button")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("package-request-pkg-1"));
    const message = await screen.findByTestId("lead-message-input");
    expect((message as HTMLTextAreaElement).value).toMatch(/Gold package/i);
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

  it("renders category filter chips and filters services by category", async () => {
    vi.mocked(publicProfileService.getBySlug).mockResolvedValue({
      slug: "multi",
      business_name: "Multi Cat",
      services: [
        { id: "a", name: "Churros", category: "Postres" },
        { id: "b", name: "Mesas", category: "Mobiliario" },
        { id: "c", name: "Barra", category: "Postres" },
      ],
    });

    renderAt("multi");

    // Chips render only when there are 2+ distinct categories.
    await screen.findByText("Churros");
    expect(
      screen.getByRole("button", { name: "profile.services_all_categories" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Postres" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mobiliario" }),
    ).toBeInTheDocument();

    // Filter to "Postres" — Mobiliario service disappears.
    fireEvent.click(screen.getByRole("button", { name: "Postres" }));
    expect(screen.getByText("Churros")).toBeInTheDocument();
    expect(screen.getByText("Barra")).toBeInTheDocument();
    expect(screen.queryByText("Mesas")).not.toBeInTheDocument();
  });

  it("caps the services list and reveals the rest via 'show all'", async () => {
    // 8 services in a single category → no chips, but the list is capped at 6.
    const services = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      name: `Service ${i}`,
      category: "Single",
    }));
    vi.mocked(publicProfileService.getBySlug).mockResolvedValue({
      slug: "many",
      business_name: "Many Co",
      services,
    });

    renderAt("many");

    // Only the first 6 render initially.
    await screen.findByText("Service 0");
    for (let i = 0; i < 6; i++) {
      expect(screen.getByText(`Service ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("Service 6")).not.toBeInTheDocument();

    // The "show all" button renders (the i18n mock returns the key verbatim;
    // the interpolation is covered by the locale files, not the test harness).
    const showAll = await screen.findByTestId("show-all-services");
    expect(showAll).toHaveTextContent("profile.services_show_all");

    fireEvent.click(showAll);
    expect(screen.getByText("Service 6")).toBeInTheDocument();
    expect(screen.getByText("Service 7")).toBeInTheDocument();
  });
});
