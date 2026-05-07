import { AuthorLicenseBox } from "./Licenses";
import { License } from "../types";

describe("AuthorLicenseBox Component", { tags: ["@group4"] }, () => {
  const mockSingleLicense: License = {
    code: "CCBYSA",
    name: "Creative Commons Attribution-ShareAlike",
    description:
      "You are free to share and adapt the work, with attribution and under the same license",
    imageURL: null,
    smallImageURL: null,
    licenseURL: "https://creativecommons.org/licenses/by-sa/4.0/",
    isComposition: false,
    composedOf: [],
  };

  const mockComposedLicense: License = {
    code: "CCDUAL",
    name: "CC-BY-SA / CC0 Composition",
    description: "Combination of CC-BY-SA and CC0 licenses",
    imageURL: null,
    smallImageURL: null,
    licenseURL: null,
    isComposition: true,
    composedOf: [
      {
        code: "CCBYSA",
        name: "Creative Commons Attribution-ShareAlike",
        description:
          "You are free to share and adapt the work, with attribution and under the same license",
        imageURL: null,
        smallImageURL: null,
        licenseURL: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
      {
        code: "CCDUAL",
        name: "Creative Commons Zero",
        description: "Waive all rights to the work",
        imageURL: null,
        smallImageURL: null,
        licenseURL: "https://creativecommons.org/publicdomain/zero/1.0/",
      },
    ],
  };

  const defaultProps = {
    license: mockSingleLicense,
    contentTypeName: "activity",
    isShared: false,
  };

  it("renders correctly and is accessible with single license", () => {
    cy.mount(<AuthorLicenseBox {...defaultProps} />);

    // Verify the component renders with expected content
    cy.contains("This activity will be shared using the license:").should(
      "be.visible",
    );
    cy.contains("Creative Commons Attribution").should("be.visible");

    // Check accessibility
    cy.checkAccessibility("body");
  });

  it("is accessible with composed license", () => {
    cy.mount(
      <AuthorLicenseBox {...defaultProps} license={mockComposedLicense} />,
    );

    cy.contains("This activity will be shared with these licenses:").should(
      "be.visible",
    );
    cy.contains("Creative Commons Attribution").should("be.visible");
    cy.contains("Creative Commons Zero").should("be.visible");
    cy.contains("(You authorize reuse under any of these licenses.)").should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });

  it("is accessible when content is already shared", () => {
    cy.mount(<AuthorLicenseBox {...defaultProps} isShared={true} />);

    cy.contains("This activity is shared using the license:").should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });

  it("is accessible when explanation is skipped", () => {
    cy.mount(<AuthorLicenseBox {...defaultProps} skipExplanation={true} />);

    // License item should still be visible
    cy.contains("Creative Commons Attribution").should("be.visible");

    // Explanation text should not be visible
    cy.contains("This activity will be shared using the license:").should(
      "not.exist",
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with composed license skipping explanation", () => {
    cy.mount(
      <AuthorLicenseBox
        {...defaultProps}
        license={mockComposedLicense}
        skipExplanation={true}
      />,
    );

    cy.contains("Creative Commons Attribution").should("be.visible");
    cy.contains("Creative Commons Zero").should("be.visible");

    // Explanation should be skipped
    cy.contains("This activity will be shared with these licenses:").should(
      "not.exist",
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with different content type name", () => {
    cy.mount(<AuthorLicenseBox {...defaultProps} contentTypeName="document" />);

    cy.contains("This document will be shared using the license:").should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });
});
