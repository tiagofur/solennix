import { describe, it, expect } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@tests/customRender";
import { EventFormLinksPage } from "./EventFormLinksPage";

describe("EventFormLinksPage redirect", () => {
  it("redirects to /requests?tab=links", () => {
    render(
      <MemoryRouter initialEntries={["/event-forms"]}>
        <Routes>
          <Route path="/event-forms" element={<EventFormLinksPage />} />
          <Route
            path="/requests"
            element={<div data-testid="requests-hub">hub</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("requests-hub")).toBeInTheDocument();
  });
});
