import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import PublicProfileSettings from "./PublicProfileSettings";

let mockUser: Record<string, unknown> = { id: "1", plan: "pro", public_slug: "alice" };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const getMock = vi.fn();
const upsertMock = vi.fn();
const listPortfolioMock = vi.fn();
const listCandidatesMock = vi.fn();
const createPortfolioMock = vi.fn();
const deletePortfolioMock = vi.fn();
const listServicesMock = vi.fn();
const setServicesMock = vi.fn();
vi.mock("@/services/publicProfileConfigService", () => ({
  publicProfileConfigService: {
    getMyPublicProfile: () => getMock(),
    upsertMyPublicProfile: (body: unknown) => upsertMock(body),
    listPortfolio: () => listPortfolioMock(),
    listPortfolioCandidates: () => listCandidatesMock(),
    createPortfolioItem: (body: unknown) => createPortfolioMock(body),
    deletePortfolioItem: (id: string) => deletePortfolioMock(id),
    listServices: () => listServicesMock(),
    setServices: (ids: string[]) => setServicesMock(ids),
  },
}));

describe("PublicProfileSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "1", plan: "pro", public_slug: "alice" };
    getMock.mockResolvedValue({
      user_id: "1",
      is_enabled: true,
      headline: "Hi",
      city: "Lisbon",
      contact_type: "email",
      contact_value: "a@b.com",
      show_prices: false,
      show_services: true,
      show_reviews: true,
      show_portfolio: true,
      show_contact: true,
      socials: { instagram: "@x" },
      public_slug: "alice",
      created_at: "",
      updated_at: "",
    });
    listPortfolioMock.mockResolvedValue([]);
    listCandidatesMock.mockResolvedValue([]);
    listServicesMock.mockResolvedValue([]);
  });

  it("loads existing profile and renders fields", async () => {
    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-slug")).toHaveValue("alice");
    });
    expect(screen.getByTestId("pp-headline")).toHaveValue("Hi");
    expect(screen.getByTestId("pp-city")).toHaveValue("Lisbon");
    expect(screen.getByTestId("pp-enabled")).toBeChecked();
    expect(screen.getByTestId("pp-share-url").textContent).toContain("/u/alice");
  });

  it("shows slug format error for invalid input", async () => {
    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-slug")).toHaveValue("alice");
    });

    const slugInput = screen.getByTestId("pp-slug");
    fireEvent.change(slugInput, { target: { value: "Invalid Slug" } });
    expect(screen.getByTestId("pp-slug-error")).toBeInTheDocument();
  });

  it("disables Pro-only toggles on Free plan", async () => {
    mockUser = { id: "1", plan: "basic", public_slug: "alice" };
    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-slug")).toHaveValue("alice");
    });

    expect(screen.getByTestId("pp-show-reviews")).toBeDisabled();
    expect(screen.getByTestId("pp-show-portfolio")).toBeDisabled();
    expect(screen.getByTestId("pp-socials")).toBeDisabled();

    mockUser = { id: "1", plan: "pro", public_slug: "alice" }; // restore
  });

  it("calls upsert on save with merged body", async () => {
    upsertMock.mockResolvedValue({
      user_id: "1",
      is_enabled: true,
      public_slug: "alice",
      show_services: true,
      show_reviews: true,
      show_portfolio: true,
      show_contact: true,
      show_prices: false,
      created_at: "",
      updated_at: "",
    });
    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-save")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("pp-save"));
    await waitFor(() => {
      expect(upsertMock).toHaveBeenCalledTimes(1);
    });
    const body = upsertMock.mock.calls[0][0];
    expect(body.public_slug).toBe("alice");
    expect(body.is_enabled).toBe(true);
  });

  it("shows slug taken error on 409", async () => {
    upsertMock.mockRejectedValue({ status: 409 });
    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-save")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("pp-save"));
    await waitFor(() => {
      expect(screen.getByTestId("pp-error")).toBeInTheDocument();
    });
  });

  it("loads portfolio items for Pro plan and allows delete", async () => {
    listPortfolioMock.mockResolvedValue([
      {
        id: "p1",
        user_id: "1",
        title: "Wedding",
        photo_url: "https://cdn.example/w.jpg",
        sort_order: 0,
        created_at: "",
        updated_at: "",
      },
    ]);
    deletePortfolioMock.mockResolvedValue(undefined);

    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-portfolio-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Wedding")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("pp-portfolio-delete-p1"));
    await waitFor(() => {
      expect(deletePortfolioMock).toHaveBeenCalledWith("p1");
    });
  });

  it("adds a portfolio item from an event candidate", async () => {
    listCandidatesMock.mockResolvedValue([
      {
        id: "e1",
        service_type: "Gala",
        event_date: "2024-06-15",
        photos: [{ id: "ph1", url: "https://cdn.example/g.jpg" }],
      },
    ]);
    createPortfolioMock.mockResolvedValue({
      id: "p2",
      user_id: "1",
      title: "Gala",
      photo_url: "https://cdn.example/g.jpg",
      event_id: "e1",
      event_date: "2024-06-15",
      sort_order: 0,
      created_at: "",
      updated_at: "",
    });

    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-portfolio-add")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("pp-portfolio-event"), {
      target: { value: "e1" },
    });
    fireEvent.click(screen.getByTestId("pp-portfolio-add"));

    await waitFor(() => {
      expect(createPortfolioMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: "e1",
          photo_id: "ph1",
        }),
      );
    });
    expect(screen.getByText("Gala")).toBeInTheDocument();
  });

  it("hides portfolio form on Free plan", async () => {
    mockUser = { id: "1", plan: "basic", public_slug: "alice" };
    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-portfolio-section")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("pp-portfolio-add")).not.toBeInTheDocument();
    expect(listPortfolioMock).not.toHaveBeenCalled();
    expect(listCandidatesMock).not.toHaveBeenCalled();
    mockUser = { id: "1", plan: "pro", public_slug: "alice" };
  });

  it("loads services and saves selection", async () => {
    listServicesMock.mockResolvedValue([
      {
        id: "s1",
        name: "Catering",
        category: "main",
        base_price: 100,
        show_on_public_profile: false,
      },
      {
        id: "s2",
        name: "Bar",
        category: "side",
        base_price: 50,
        show_on_public_profile: true,
      },
    ]);
    setServicesMock.mockResolvedValue([
      {
        id: "s1",
        name: "Catering",
        category: "main",
        base_price: 100,
        show_on_public_profile: true,
      },
      {
        id: "s2",
        name: "Bar",
        category: "side",
        base_price: 50,
        show_on_public_profile: true,
      },
    ]);

    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-services-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Catering")).toBeInTheDocument();
    expect(screen.getByTestId("pp-service-check-s2")).toBeChecked();

    fireEvent.click(screen.getByTestId("pp-service-check-s1"));
    fireEvent.click(screen.getByTestId("pp-services-save"));

    await waitFor(() => {
      expect(setServicesMock).toHaveBeenCalled();
    });
    const ids = setServicesMock.mock.calls[0][0] as string[];
    expect(ids).toEqual(expect.arrayContaining(["s1", "s2"]));
  });

  it("enforces Free max 3 services on client", async () => {
    mockUser = { id: "1", plan: "basic", public_slug: "alice" };
    listServicesMock.mockResolvedValue([
      { id: "a", name: "A", category: "main", base_price: 1, show_on_public_profile: true },
      { id: "b", name: "B", category: "main", base_price: 2, show_on_public_profile: true },
      { id: "c", name: "C", category: "main", base_price: 3, show_on_public_profile: true },
      { id: "d", name: "D", category: "main", base_price: 4, show_on_public_profile: false },
    ]);

    render(<PublicProfileSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("pp-services-list")).toBeInTheDocument();
    });

    // Fourth checkbox should be disabled when already at Free limit.
    expect(screen.getByTestId("pp-service-check-d")).toBeDisabled();
    mockUser = { id: "1", plan: "pro", public_slug: "alice" };
  });
});
