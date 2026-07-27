import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import PublicProfileSettings from "./PublicProfileSettings";
import { publicProfileConfigService } from "@/services/publicProfileConfigService";

let mockUser: Record<string, unknown> = { id: "1", plan: "pro", public_slug: "alice" };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const getMock = vi.fn();
const upsertMock = vi.fn();
vi.mock("@/services/publicProfileConfigService", () => ({
  publicProfileConfigService: {
    getMyPublicProfile: () => getMock(),
    upsertMyPublicProfile: (body: unknown) => upsertMock(body),
  },
}));

describe("PublicProfileSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
