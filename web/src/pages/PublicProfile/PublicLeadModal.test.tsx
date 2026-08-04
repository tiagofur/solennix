import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { http, HttpResponse } from "msw";
import { server } from "../../../tests/mocks/server";
import { PublicLeadModal } from "./PublicLeadModal";

const API_BASE = "http://localhost:8080/api";

// Mock publicRequestService via MSW (real fetch interception, consistent with
// service tests). publicProfileService import is kept only for the type.
vi.mock("@/services/publicProfileService", () => ({
  publicProfileService: {},
}));

const services = [
  { id: "svc-1", name: "DJ", category: "musica", base_price: 500 },
  { id: "svc-2", name: "Catering", category: "comida", base_price: 1500 },
];

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <PublicLeadModal
        isOpen
        onClose={vi.fn()}
        slug="alice"
        businessName="Alice Catering"
        services={services}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByTestId("lead-email-input"), {
    target: { value: "client@example.com" },
  });
}

describe("PublicLeadModal (solicitud estructurada, #1118)", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("renders null when closed", () => {
    render(
      <MemoryRouter>
        <PublicLeadModal isOpen={false} onClose={vi.fn()} slug="alice" businessName="Alice" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with new structured fields when open", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("lead-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("lead-location-input")).toBeInTheDocument();
    expect(screen.getByTestId("lead-budget-input")).toBeInTheDocument();
    expect(screen.getByTestId("lead-services-section")).toBeInTheDocument();
    expect(screen.getByTestId("lead-submit-button")).toBeInTheDocument();
  });

  it("shows the legal disclaimer", () => {
    renderModal();
    expect(screen.getByTestId("lead-disclaimer")).toBeInTheDocument();
    expect(screen.getByTestId("lead-disclaimer").textContent).toMatch(/acuerdo|direct/i);
  });

  it("hides services section when organizer has no services", () => {
    renderModal({ services: [] });
    expect(screen.queryByTestId("lead-services-section")).not.toBeInTheDocument();
  });

  it("submits structured payload to /requests on valid form", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post(`${API_BASE}/public/organizers/alice/requests`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            data: {
              id: "req-1",
              status: "pending",
              client_token: "tok-1",
            },
          },
          { status: 201 },
        );
      }),
    );
    renderModal();

    fillValidForm();
    fireEvent.change(screen.getByTestId("lead-event-type-select"), {
      target: { value: "wedding" },
    });
    fireEvent.click(screen.getByTestId("lead-services-toggle"));
    fireEvent.click(screen.getByTestId("lead-service-svc-1"));

    fireEvent.click(screen.getByTestId("lead-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("lead-success-view")).toBeInTheDocument();
    });
    expect(capturedBody.contact_email).toBe("client@example.com");
    expect(capturedBody.event_type).toBe("wedding");
    expect(capturedBody.services).toEqual([{ product_id: "svc-1", qty: 1 }]);
    expect(capturedBody.currency).toBe("MXN");
    expect(capturedBody.website).toBe("");
    expect(screen.getByTestId("lead-status-link")).toBeInTheDocument();
    // #1132 — clear "what next" steps for the visitor
    expect(screen.getByTestId("lead-success-next-steps")).toBeInTheDocument();
  });

  it("includes honeypot input hidden from users", () => {
    renderModal();
    const honeypot = screen.getByTestId("lead-honeypot");
    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveAttribute("tabIndex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
  });

  it("rejects invalid email with client-side validation", async () => {
    renderModal();
    fireEvent.change(screen.getByTestId("lead-email-input"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    expect(screen.getByTestId("lead-error")).toBeInTheDocument();
    expect(screen.getByTestId("lead-error").textContent).toMatch(/correo|email/i);
  });

  it("rejects past event date with client-side validation", async () => {
    renderModal();
    fireEvent.change(screen.getByTestId("lead-email-input"), {
      target: { value: "client@example.com" },
    });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    fireEvent.change(screen.getByTestId("lead-event-date-input"), {
      target: { value: yesterday.toISOString().slice(0, 10) },
    });
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    expect(screen.getByTestId("lead-error").textContent).toMatch(/fecha|future/i);
  });

  it("shows inbox_full message on 429 inbox_full", async () => {
    server.use(
      http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
        HttpResponse.json(
          { error: "inbox_full", message: "inbox full" },
          { status: 429 },
        ),
      ),
    );
    renderModal();
    fillValidForm();
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("lead-error").textContent).toMatch(/bandeja|inbox/i);
    });
  });

  it("shows not_found message on 404", async () => {
    server.use(
      http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
        HttpResponse.json({ error: "not_found" }, { status: 404 }),
      ),
    );
    renderModal();
    fillValidForm();
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("lead-error").textContent).toMatch(/disponible|available/i);
    });
  });

  it("shows generic error on 500", async () => {
    server.use(
      http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    renderModal();
    fillValidForm();
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("lead-error")).toBeInTheDocument();
    });
  });

  it("toggles service selection on click", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("lead-services-toggle"));
    const chip = screen.getByTestId("lead-service-svc-1");
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("disables submit button while submitting", async () => {
    server.use(
      http.post(`${API_BASE}/public/organizers/alice/requests`, async () => {
        await new Promise((r) => setTimeout(r, 500));
        return HttpResponse.json({ data: { id: "x" } }, { status: 201 });
      }),
    );
    renderModal();
    fillValidForm();
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("lead-submit-button")).toBeDisabled();
    });
  });
});
