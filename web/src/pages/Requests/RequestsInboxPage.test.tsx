import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@tests/customRender";
import { RequestsInboxPage } from "./RequestsInboxPage";
import { organizerRequestsService } from "@/services/organizerRequestsService";

vi.mock("@/services/organizerRequestsService", () => ({
  organizerRequestsService: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    get: vi.fn(),
    markRead: vi.fn(),
    respond: vi.fn(),
    decline: vi.fn(),
    requestInfo: vi.fn(),
    convertToEvent: vi.fn(),
  },
}));

vi.mock("@/services/requestLinkService", () => ({
  requestLinkService: {
    listLinks: vi.fn().mockResolvedValue([]),
    createLink: vi.fn(),
    revokeLink: vi.fn(),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: (selector?: (s: { addToast: () => void }) => unknown) => {
    const state = { addToast: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

describe("RequestsInboxPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizerRequestsService.list).mockResolvedValue({
      data: [
        {
          id: "r1",
          contact_name: "María",
          contact_email: "m@example.com",
          event_type: "boda",
          status: "pending",
          is_read: false,
          created_at: "2026-08-01T12:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      total_pages: 1,
    });
    vi.mocked(organizerRequestsService.unreadCount).mockResolvedValue(1);
  });

  it("renders title and request row", async () => {
    render(
      <MemoryRouter>
        <RequestsInboxPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("María")).toBeInTheDocument();
    });
    expect(screen.getByTestId("request-row-r1")).toBeInTheDocument();
    expect(screen.getByTestId("requests-status-filter")).toBeInTheDocument();
    expect(screen.getByTestId("requests-hub-tabs")).toBeInTheDocument();
  });

  it("shows empty state when no requests", async () => {
    vi.mocked(organizerRequestsService.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      total_pages: 0,
    });
    vi.mocked(organizerRequestsService.unreadCount).mockResolvedValue(0);
    render(
      <MemoryRouter>
        <RequestsInboxPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/aún no hay solicitudes|no quote requests/i)).toBeInTheDocument();
    });
  });

  it("switches to Links tab and shows panel", async () => {
    render(
      <MemoryRouter initialEntries={["/requests"]}>
        <RequestsInboxPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("requests-tab-links")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("requests-tab-links"));
    await waitFor(() => {
      expect(screen.getByTestId("request-links-panel")).toBeInTheDocument();
    });
  });

  it("opens Links tab from ?tab=links query", async () => {
    render(
      <MemoryRouter initialEntries={["/requests?tab=links"]}>
        <RequestsInboxPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("request-links-panel")).toBeInTheDocument();
    });
  });

  it("fetches page 2 when clicking pagination", async () => {
    vi.mocked(organizerRequestsService.list).mockResolvedValue({
      data: [
        {
          id: "r1",
          contact_name: "María",
          contact_email: "m@example.com",
          event_type: "boda",
          status: "pending",
          is_read: true,
          created_at: "2026-08-01T12:00:00Z",
        },
      ],
      total: 60,
      page: 1,
      limit: 50,
      total_pages: 2,
    });
    render(
      <MemoryRouter initialEntries={["/requests"]}>
        <RequestsInboxPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("request-row-r1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ir a la página 2" }));
    await waitFor(() => {
      expect(organizerRequestsService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 50 }),
      );
    });
  });

  it("resets to page 1 when the status filter changes", async () => {
    vi.mocked(organizerRequestsService.list).mockResolvedValue({
      data: [
        {
          id: "r1",
          contact_name: "María",
          contact_email: "m@example.com",
          event_type: "boda",
          status: "pending",
          is_read: true,
          created_at: "2026-08-01T12:00:00Z",
        },
      ],
      total: 60,
      page: 1,
      limit: 50,
      total_pages: 2,
    });
    render(
      <MemoryRouter initialEntries={["/requests"]}>
        <RequestsInboxPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(organizerRequestsService.list).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId("request-row-r1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ir a la página 2" }));
    await waitFor(() => {
      expect(organizerRequestsService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
    fireEvent.change(screen.getByTestId("requests-status-filter"), {
      target: { value: "pending" },
    });
    await waitFor(() => {
      expect(organizerRequestsService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: "pending" }),
      );
    });
  });
});
