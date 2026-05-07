import { DoenetHeading } from "./Heading";

describe("DoenetHeading", { tags: ["@group4"] }, () => {
  describe("rendering", () => {
    it("renders nothing when neither heading nor subheading is provided", () => {
      cy.mount(<DoenetHeading />);

      cy.get("h2").should("not.exist");
      cy.get("h3").should("not.exist");

      cy.checkAccessibility("body");
    });

    it("renders heading when provided", () => {
      cy.mount(<DoenetHeading heading="Main Title" />);

      cy.get("h2").should("contain.text", "Main Title");
      cy.get("h3").should("not.exist");

      cy.checkAccessibility("body");
    });

    it("renders subheading when provided", () => {
      cy.mount(<DoenetHeading subheading="Subtitle" />);

      cy.get("h2").should("not.exist");
      cy.get("h3").should("contain.text", "Subtitle");

      cy.checkAccessibility("body");
    });

    it("renders both heading and subheading when both provided", () => {
      cy.mount(<DoenetHeading heading="Main Title" subheading="Subtitle" />);

      cy.get("h2").should("contain.text", "Main Title");
      cy.get("h3").should("contain.text", "Subtitle");

      cy.checkAccessibility("body");
    });
  });

  describe("heading properties", () => {
    it("truncates heading text with line clamping", () => {
      cy.mount(
        <DoenetHeading heading="This is a very long heading that should be truncated with noOfLines set to 1" />,
      );

      cy.get("h2").should("exist");
      // Chakra's noOfLines uses CSS line-clamp
      cy.get("h2").should("have.css", "overflow", "hidden");
    });

    it("truncates subheading text with line clamping", () => {
      cy.mount(
        <DoenetHeading subheading="This is a very long subheading that should be truncated with noOfLines set to 1" />,
      );

      cy.get("h3").should("exist");
      cy.get("h3").should("have.css", "overflow", "hidden");
    });
  });
});
