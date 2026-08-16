import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// The core interaction, stated plainly (assignment-1 spec): the visitor sets
// how many cars are on the road and can brake one of them, and sees the
// result — car colour by speed, and live average-speed / stopped-count
// stats. This asserts the contract (these controls and readouts exist and
// are wired up as real controls), not how the OVM simulation is implemented.
//
// data-testid contract — rename here and in your markup together if you'd
// rather use different names:
const CANVAS = '[data-testid="road-canvas"]';
const CAR_COUNT_SLIDER = '[data-testid="car-count-slider"]';
const BRAKE_BUTTON = '[data-testid="brake-button"]';
const AVG_SPEED = '[data-testid="avg-speed"]';
const STOPPED_COUNT = '[data-testid="stopped-count"]';

const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window.document;

describe("core interaction: circular-road traffic simulation", () => {
  it("renders the road on a canvas", () => {
    const canvas = doc.querySelector(CANVAS);
    expect(canvas, `expected a canvas matching ${CANVAS}`).toBeTruthy();
    expect(canvas?.tagName.toLowerCase()).toBe("canvas");
  });

  it("lets the visitor control how many cars are on the road", () => {
    const slider = doc.querySelector(CAR_COUNT_SLIDER);
    expect(slider, `expected a range input matching ${CAR_COUNT_SLIDER}`).toBeTruthy();
    expect(slider?.tagName.toLowerCase()).toBe("input");
    expect(slider?.getAttribute("type")).toBe("range");

    const min = Number(slider?.getAttribute("min"));
    const max = Number(slider?.getAttribute("max"));
    expect(Number.isFinite(min) && Number.isFinite(max), "slider needs min and max set").toBe(
      true,
    );
    expect(max, "needs enough range to go from smooth flow to a jam").toBeGreaterThan(min + 5);

    // The slider is a control, not decoration — an unlabelled range input
    // reads as nothing to a screen reader.
    const labelled =
      slider?.hasAttribute("aria-label") ||
      (slider?.id && doc.querySelector(`label[for="${slider.id}"]`));
    expect(labelled, "slider needs an aria-label or an associated <label>").toBeTruthy();
  });

  it("gives the visitor a way to brake one car", () => {
    const brake = doc.querySelector(BRAKE_BUTTON);
    expect(brake, `expected a button matching ${BRAKE_BUTTON}`).toBeTruthy();
    expect(brake?.tagName.toLowerCase()).toBe("button");
    expect(brake?.textContent?.toLowerCase()).toContain("brake");
  });

  it("shows live average speed and stopped-car stats", () => {
    const avgSpeed = doc.querySelector(AVG_SPEED);
    const stoppedCount = doc.querySelector(STOPPED_COUNT);
    expect(avgSpeed, `expected a stat matching ${AVG_SPEED}`).toBeTruthy();
    expect(stoppedCount, `expected a stat matching ${STOPPED_COUNT}`).toBeTruthy();
  });
});
