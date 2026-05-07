import { EditLicense } from "./EditLicense";
import { License, LicenseCode } from "../../types";

describe("EditLicense Component", { tags: ["@group3"] }, () => {
  const mockLicenses: License[] = [
    {
      code: "CCBYSA",
      name: "Creative Commons Attribution-ShareAlike",
      description: "You are free to share and adapt the work",
      imageURL: null,
      smallImageURL: null,
      licenseURL: null,
      isComposition: false,
      composedOf: [],
    },
    {
      code: "CCDUAL",
      name: "Creative Commons Dual License",
      description: "Dual licensing option",
      imageURL: null,
      smallImageURL: null,
      licenseURL: null,
      isComposition: true,
      composedOf: [
        {
          code: "CCBYSA",
          name: "Creative Commons Attribution-ShareAlike",
          description: "You are free to share and adapt the work",
          imageURL: null,
          smallImageURL: null,
          licenseURL: null,
        },
      ],
    },
  ];

  const defaultProps = {
    contentId: "test-content-123",
    code: "CCBYSA" as LicenseCode,
    remixSourceLicenseCode: null,
    isPublic: false,
    isShared: false,
    allLicenses: mockLicenses,
  };

  it("renders correctly and is accessible", () => {
    cy.mount(<EditLicense {...defaultProps} />);

    // Verify the component renders with expected content
    cy.contains(
      "This document will be shared under the following license(s)",
    ).should("be.visible");
    cy.get("select").should("be.visible");

    // Check accessibility
    cy.checkAccessibility("body");
  });

  it("is accessible with no license selected", () => {
    cy.mount(<EditLicense {...defaultProps} code={null} />);

    cy.contains(
      "This document will be shared under the following license(s)",
    ).should("be.visible");
    cy.get("select").should("have.value", "");

    cy.checkAccessibility("body");
  });

  it("is accessible when document is already shared without license", () => {
    cy.mount(<EditLicense {...defaultProps} isPublic={true} code={null} />);

    cy.contains(
      "This document is shared under the following license(s)",
    ).should("be.visible");
    cy.contains("This document is shared without specifying a license").should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });

  it("is accessible when document is already shared with license", () => {
    cy.mount(<EditLicense {...defaultProps} isPublic={true} />);

    cy.contains(
      "This document is shared under the following license(s)",
    ).should("be.visible");
    cy.contains("Creative Commons Attribution-ShareAlike").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when license is determined from remix source", () => {
    cy.mount(<EditLicense {...defaultProps} remixSourceLicenseCode="CCBYSA" />);

    cy.get("select").should("be.disabled");
    cy.contains("Cannot change license since remixed from activity").should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with shared flag", () => {
    cy.mount(<EditLicense {...defaultProps} isShared={true} />);

    cy.contains(
      "This document is shared under the following license(s)",
    ).should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible with different license selected", () => {
    cy.mount(<EditLicense {...defaultProps} code="CCDUAL" />);

    cy.contains(
      "This document will be shared under the following license(s)",
    ).should("be.visible");
    cy.contains("Creative Commons Dual License").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("is accessible when license is shared and no license selected warning is shown", () => {
    cy.mount(<EditLicense {...defaultProps} isShared={true} code={null} />);

    cy.contains("This document is shared without specifying a license").should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });
});
