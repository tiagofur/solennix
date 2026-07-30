import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "./Reveal";

describe("Reveal", () => {
  it("renders its children", () => {
    render(
      <Reveal>
        <span>content</span>
      </Reveal>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders visible by default before the observer fires (no opacity-0)", () => {
    const { container } = render(
      <Reveal>
        <span>content</span>
      </Reveal>,
    );
    // Initially mounted=false, so content should NOT be hidden.
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain("opacity-0");
    expect(wrapper.className).toContain("animate-fade-in-up");
  });
});
