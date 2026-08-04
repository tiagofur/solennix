import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor, fireEvent } from "@tests/customRender";
import { http, HttpResponse } from "msw";
import { server } from "../../../tests/mocks/server";
import { PublicRequestLinkPage } from "./PublicRequestLinkPage";

const API_BASE = "http://localhost:8080/api";

const linkPayload = {
  link_id: "link-1",
  submit_mode: "auto_event",
  label: "Paquete XV",
  expires_at: null,
  organizer: {
    business_name: "Alice Events",
    brand_color: "#112233",
    logo_url: null,
  },
  products: [{ id: "p1", name: "DJ", category: "music", base_price: 500 }],
  profile_enabled: true,
};

function renderPage(token = "tok-abc") {
  return render(
    <MemoryRouter initialEntries={[`/s/${token}`]}>
      <Routes>
        <Route path="/s/:token" element={<PublicRequestLinkPage />} />
        <Route path="/solicitud/:id" element={<div data-testid="status-page">status</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicRequestLinkPage", () => {
  beforeEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
  });

  it("loads link data and renders form", async () => {
    server.use(
      http.get(`${API_BASE}/public/request-links/tok-abc`, () =>
        HttpResponse.json({ data: linkPayload }),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("request-link-page")).toBeInTheDocument();
    });
    expect(screen.getByText("Alice Events")).toBeInTheDocument();
    expect(screen.getByText("Paquete XV")).toBeInTheDocument();
    expect(screen.getByTestId("request-link-submit-button")).toBeInTheDocument();
  });

  it("shows expired UI on 410", async () => {
    server.use(
      http.get(`${API_BASE}/public/request-links/tok-abc`, () =>
        HttpResponse.json(
          { error: "link_invalid", message: "gone" },
          { status: 410 },
        ),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/enlace no disponible|link.*unavailable|not available/i)).toBeInTheDocument();
    });
  });

  it("shows auto_event success without navigating to status", async () => {
    server.use(
      http.get(`${API_BASE}/public/request-links/tok-abc`, () =>
        HttpResponse.json({ data: linkPayload }),
      ),
      http.post(`${API_BASE}/public/request-links/tok-abc/requests`, () =>
        HttpResponse.json(
          {
            data: {
              id: "req-1",
              status: "booked",
              event_id: "evt-9",
              client_token: "ct",
            },
          },
          { status: 201 },
        ),
      ),
    );
    renderPage();
    await waitFor(() => screen.getByTestId("request-link-name-input"));

    fireEvent.change(screen.getByTestId("request-link-name-input"), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByTestId("request-link-phone-input"), {
      target: { value: "+52111222333" },
    });
    fireEvent.change(screen.getByTestId("request-link-event-date-input"), {
      target: { value: "2099-06-01" },
    });
    fireEvent.change(screen.getByTestId("request-link-guests-input"), {
      target: { value: "80" },
    });
    fireEvent.click(screen.getByTestId("request-link-submit-button"));

    await waitFor(() => {
      expect(
        screen.getByTestId("request-link-auto-event-success"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId("status-page")).not.toBeInTheDocument();
  });

  it("navigates to /solicitud/:id for standard mode", async () => {
    server.use(
      http.get(`${API_BASE}/public/request-links/tok-abc`, () =>
        HttpResponse.json({
          data: { ...linkPayload, submit_mode: "standard" },
        }),
      ),
      http.post(`${API_BASE}/public/request-links/tok-abc/requests`, () =>
        HttpResponse.json(
          {
            data: {
              id: "req-99",
              status: "pending",
              client_token: "tok-visitor",
            },
          },
          { status: 201 },
        ),
      ),
    );
    renderPage();
    await waitFor(() => screen.getByTestId("request-link-submit-button"));

    fireEvent.change(screen.getByTestId("request-link-email-input"), {
      target: { value: "client@example.com" },
    });
    fireEvent.click(screen.getByTestId("request-link-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("status-page")).toBeInTheDocument();
    });
    expect(sessionStorage.getItem("public_request_token:req-99")).toBe(
      "tok-visitor",
    );
  });
});
