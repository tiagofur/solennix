import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { render } from "@tests/customRender";
import { server } from "../../../tests/mocks/server";
import { PublicRequestStatusPage } from "./PublicRequestStatusPage";
import { PUBLIC_REQUEST_TOKEN_KEY } from "@/services/publicRequestService";

const API_BASE = "http://localhost:8080/api";

function renderStatus(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/solicitud/:id" element={<PublicRequestStatusPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicRequestStatusPage", () => {
  beforeEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
  });

  it("shows missing-token message when no token is available", () => {
    renderStatus("/solicitud/req-1");
    expect(screen.getByTestId("request-status-missing-token")).toBeInTheDocument();
  });

  it("renders accept/decline when token is in query", () => {
    renderStatus("/solicitud/req-1?token=tok-abc");
    expect(screen.getByTestId("request-status-page")).toBeInTheDocument();
    expect(screen.getByTestId("request-status-accept")).toBeInTheDocument();
    expect(screen.getByTestId("request-status-decline")).toBeInTheDocument();
  });

  it("uses sessionStorage token when query is absent", () => {
    sessionStorage.setItem(PUBLIC_REQUEST_TOKEN_KEY("req-1"), "tok-session");
    renderStatus("/solicitud/req-1");
    expect(screen.getByTestId("request-status-page")).toBeInTheDocument();
  });

  it("calls client action on accept", async () => {
    const captured: { action?: string; token?: string | null } = {};
    server.use(
      http.post(`${API_BASE}/public/requests/req-1/action`, async ({ request }) => {
        captured.token = request.headers.get("X-Request-Token");
        const body = (await request.json()) as { action: string };
        captured.action = body.action;
        return new HttpResponse(null, { status: 200 });
      }),
    );
    renderStatus("/solicitud/req-1?token=tok-abc");
    fireEvent.click(screen.getByTestId("request-status-accept"));
    await waitFor(() => {
      expect(screen.getByTestId("request-status-success")).toBeInTheDocument();
    });
    expect(captured.action).toBe("accept");
    expect(captured.token).toBe("tok-abc");
  });
});
