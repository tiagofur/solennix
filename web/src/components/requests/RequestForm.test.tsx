import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import {
  RequestForm,
  validateRequestForm,
  buildRequestPayload,
} from "./RequestForm";

const t = (key: string) => key;

describe("validateRequestForm", () => {
  const base = {
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    eventType: "wedding",
    eventDate: "",
    numGuests: "",
    budget: "",
  };

  it("requires valid email on profile mode", () => {
    expect(
      validateRequestForm(
        { ...base, contactEmail: "bad" },
        { mode: "profile", submitMode: "standard" },
        t,
      ),
    ).toBe("profile.request.email_invalid");
    expect(
      validateRequestForm(
        { ...base, contactEmail: "ok@example.com" },
        { mode: "profile", submitMode: "standard" },
        t,
      ),
    ).toBeNull();
  });

  it("requires email or phone on link standard mode", () => {
    expect(
      validateRequestForm(base, { mode: "link", submitMode: "standard" }, t),
    ).toBe("profile.request.contact_required");
    expect(
      validateRequestForm(
        { ...base, contactPhone: "+52111" },
        { mode: "link", submitMode: "standard" },
        t,
      ),
    ).toBeNull();
  });

  it("requires name+phone+date+type+guests for auto_event", () => {
    const partial = {
      ...base,
      contactPhone: "+52111",
      contactName: "Ana",
    };
    expect(
      validateRequestForm(
        partial,
        { mode: "link", submitMode: "auto_event" },
        t,
      ),
    ).toBe("profile.request.date_required");

    expect(
      validateRequestForm(
        {
          ...partial,
          eventDate: "2099-12-01",
          eventType: "wedding",
          numGuests: "50",
        },
        { mode: "link", submitMode: "auto_event" },
        t,
      ),
    ).toBeNull();
  });

  it("rejects past event dates", () => {
    expect(
      validateRequestForm(
        {
          ...base,
          contactEmail: "ok@example.com",
          eventDate: "2020-01-01",
        },
        { mode: "profile", submitMode: "standard" },
        t,
      ),
    ).toBe("profile.request.date_past");
  });
});

describe("buildRequestPayload", () => {
  it("maps services with qty and honeypot", () => {
    const payload = buildRequestPayload({
      contactName: "Ana",
      contactEmail: "a@b.com",
      contactPhone: "+52",
      eventType: "wedding",
      eventDate: "2099-01-01",
      location: "CDMX",
      city: "CDMX",
      numGuests: "80",
      budget: "1000",
      message: "hola",
      website: "",
      selectedServices: { p1: 2, p2: 0 },
    });
    expect(payload.services).toEqual([{ product_id: "p1", qty: 2 }]);
    expect(payload.guest_count).toBe(80);
    expect(payload.contact_phone).toBe("+52");
    expect(payload.city).toBe("CDMX");
    expect(payload.website).toBe("");
  });
});

describe("RequestForm UI", () => {
  it("renders contact and event fields and submits payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RequestForm
        mode="profile"
        catalog={[{ id: "svc-1", name: "DJ" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByTestId("lead-email-input"), {
      target: { value: "client@example.com" },
    });
    // catalog starts collapsed on profile — open it
    fireEvent.click(screen.getByTestId("lead-services-toggle"));
    fireEvent.click(screen.getByTestId("lead-service-svc-1"));
    fireEvent.click(screen.getByTestId("lead-submit-button"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.contact_email).toBe("client@example.com");
    expect(payload.services).toEqual([{ product_id: "svc-1", qty: 1 }]);
    expect(payload.currency).toBe("MXN");
  });

  it("shows validation error without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    render(<RequestForm mode="profile" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("lead-email-input"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    expect(screen.getByTestId("lead-error")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("buildRequestPayload turnstile", () => {
  const base = {
    contactName: "Ana",
    contactEmail: "a@b.com",
    contactPhone: "",
    eventType: "wedding",
    eventDate: "",
    location: "",
    city: "",
    numGuests: "",
    budget: "",
    message: "",
    website: "",
    selectedServices: {},
  };

  it("includes turnstile_token when provided", () => {
    const payload = buildRequestPayload(base, "tok-123");
    expect(payload.turnstile_token).toBe("tok-123");
  });

  it("omits turnstile_token when absent", () => {
    const payload = buildRequestPayload(base);
    expect(payload.turnstile_token).toBeUndefined();
  });
});

describe("TurnstileWidget", () => {
  it("renders nothing without a site key", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    const { TurnstileWidget } = await import("@/components/TurnstileWidget");
    const { queryByTestId } = render(
      <TurnstileWidget onVerify={vi.fn()} />,
    );
    expect(queryByTestId("turnstile-widget")).toBeNull();
  });
});

describe("RequestForm captcha gate", () => {
  it("blocks submit when configured without a token", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-key");
    const onSubmit = vi.fn();
    render(<RequestForm mode="profile" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("lead-email-input"), {
      target: { value: "client@example.com" },
    });
    fireEvent.click(screen.getByTestId("lead-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("lead-error")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
