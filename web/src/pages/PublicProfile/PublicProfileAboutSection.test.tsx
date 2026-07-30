import { describe, it, expect } from "vitest";
import { render, screen } from "@tests/customRender";
import { PublicProfileAboutSection } from "./PublicProfileAboutSection";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";

describe("PublicProfileAboutSection", () => {
  const mockProfile: PublicOrganizerProfile = {
    slug: "alice-events",
    business_name: "Alice Events",
    about: "Specialized in luxury weddings and corporate galas.",
    min_guests: 50,
    max_guests: 300,
    service_areas: ["Guadalajara", "Zapopan"],
    event_types: ["wedding", "corporate"],
    response_time: "Responde en menos de 2 horas",
    languages: ["Español", "English"],
  };

  it("renders null when no about info is present", () => {
    const emptyProfile: PublicOrganizerProfile = { slug: "empty" };
    render(<PublicProfileAboutSection profile={emptyProfile} />);
    expect(screen.queryByTestId("public-profile-about-section")).not.toBeInTheDocument();
  });

  it("renders about bio, capacity, coverage, and event types", () => {
    render(<PublicProfileAboutSection profile={mockProfile} />);
    expect(screen.getByTestId("public-profile-about-section")).toBeInTheDocument();
    expect(screen.getByTestId("about-bio-text")).toHaveTextContent(
      "Specialized in luxury weddings and corporate galas.",
    );
    expect(screen.getByTestId("about-capacity-text")).toHaveTextContent(
      "50 - 300 invitados",
    );
    expect(screen.getByTestId("about-service-areas")).toHaveTextContent(
      "GuadalajaraZapopan",
    );
    expect(screen.getByTestId("about-response-time")).toHaveTextContent(
      "Responde en menos de 2 horas",
    );
    expect(screen.getByTestId("about-languages")).toHaveTextContent(
      "Español, English",
    );
  });
});
