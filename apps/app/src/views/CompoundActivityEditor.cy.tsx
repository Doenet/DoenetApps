import { compoundEditorBodyBackground } from "./CompoundActivityEditor";

describe("compoundEditorBodyBackground", { tags: ["@group4"] }, () => {
  // The empty state previously used the fixed brand `var(--lightBlue)`, which
  // does not flip and painted a light-blue panel (with light text) on the dark
  // page. It must use a mode-flipping semantic token instead. WelcomeBanner.cy
  // .tsx separately verifies that the chosen `viewerFrame` token actually flips
  // light<->dark, so together these lock the fix.
  it("uses the mode-flipping viewerFrame token for an empty activity", () => {
    expect(compoundEditorBodyBackground(0)).to.equal("viewerFrame");
  });

  it("uses the page background token when the activity has cards", () => {
    expect(compoundEditorBodyBackground(1)).to.equal("background");
    expect(compoundEditorBodyBackground(12)).to.equal("background");
  });
});
