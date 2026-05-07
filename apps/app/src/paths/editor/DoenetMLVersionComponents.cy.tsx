import {
  DoenetMLSelectionBox,
  UpgradeSyntax,
} from "./DoenetMLVersionComponents";
import { DoenetmlVersion } from "../../types";

describe("DoenetML Version Components", { tags: ["@group1"] }, () => {
  const mockVersions: DoenetmlVersion[] = [
    {
      id: 1,
      displayedVersion: "0.6",
      fullVersion: "0.6.0",
      default: false,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    },
    {
      id: 2,
      displayedVersion: "0.7",
      fullVersion: "0.7.0",
      default: true,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    },
  ];

  describe("DoenetMLSelectionBox", () => {
    const defaultProps = {
      contentId: "test-content-123",
      versionId: 1,
      allVersions: mockVersions,
      isAssigned: false,
    };

    it("renders correctly and is accessible", () => {
      cy.mount(<DoenetMLSelectionBox {...defaultProps} />);

      // Verify the component renders with expected content
      cy.contains("Use DoenetML version").should("be.visible");
      cy.get("select").should("be.visible");

      // Check accessibility
      cy.checkAccessibility("body");
    });

    it("is accessible with deprecated version", () => {
      const deprecatedVersions: DoenetmlVersion[] = [
        {
          id: 1,
          displayedVersion: "0.6",
          fullVersion: "0.6.0",
          default: false,
          deprecated: true,
          removed: false,
          deprecationMessage:
            "Version 0.6 is no longer supported. Please upgrade to 0.7.",
        },
        {
          id: 2,
          displayedVersion: "0.7",
          fullVersion: "0.7.0",
          default: true,
          deprecated: false,
          removed: false,
          deprecationMessage: "",
        },
      ];

      cy.mount(
        <DoenetMLSelectionBox
          {...defaultProps}
          allVersions={deprecatedVersions}
          versionId={1}
        />,
      );

      cy.contains("DoenetML version 0.6 is deprecated").should("be.visible");
      cy.contains("Version 0.6 is no longer supported").should("be.visible");

      cy.checkAccessibility("body");
    });

    it("is accessible when version is assigned", () => {
      cy.mount(<DoenetMLSelectionBox {...defaultProps} isAssigned={true} />);

      cy.get("select").should("be.disabled");
      cy.contains(
        "Cannot modify DoenetML version since activity is assigned",
      ).should("be.visible");

      cy.checkAccessibility("body");
    });

    it("is accessible with multiple versions", () => {
      const manyVersions: DoenetmlVersion[] = [
        {
          id: 1,
          displayedVersion: "0.5",
          fullVersion: "0.5.0",
          default: false,
          deprecated: true,
          removed: false,
          deprecationMessage: "Outdated",
        },
        {
          id: 2,
          displayedVersion: "0.6",
          fullVersion: "0.6.0",
          default: false,
          deprecated: true,
          removed: false,
          deprecationMessage: "Deprecated",
        },
        {
          id: 3,
          displayedVersion: "0.7",
          fullVersion: "0.7.0",
          default: true,
          deprecated: false,
          removed: false,
          deprecationMessage: "",
        },
        {
          id: 4,
          displayedVersion: "0.8",
          fullVersion: "0.8.0",
          default: false,
          deprecated: false,
          removed: false,
          deprecationMessage: "",
        },
      ];

      cy.mount(
        <DoenetMLSelectionBox {...defaultProps} allVersions={manyVersions} />,
      );

      cy.get("select").find("option").should("have.length", 4);

      cy.checkAccessibility("body");
    });
  });

  describe("UpgradeSyntax", () => {
    const defaultProps = {
      contentId: "test-content-123",
      allVersions: mockVersions,
    };

    it("renders correctly and is accessible", () => {
      cy.mount(<UpgradeSyntax {...defaultProps} />);

      // Verify the button is rendered
      cy.contains("button", "Upgrade to version 0.7").should("be.visible");

      // Check accessibility
      cy.checkAccessibility("body");
    });

    it("is accessible when button is disabled", () => {
      // Intercept the API call that gets triggered when the button is clicked
      cy.intercept(
        "GET",
        "/api/activityEditView/getContentSource/test-content-123",
        {
          source: "<document><text>Sample content</text></document>",
        },
      );

      cy.mount(<UpgradeSyntax {...defaultProps} />);

      // Click the button to disable it
      cy.contains("button", "Upgrade to version 0.7").click();

      // Button should now be disabled
      cy.contains("button", "Upgrade to version 0.7").should("be.disabled");

      cy.checkAccessibility("body");
    });

    it("is accessible with different versions available", () => {
      // This would normally fail at runtime, but testing the component structure
      const versionsWithV7: DoenetmlVersion[] = [
        {
          id: 1,
          displayedVersion: "0.6",
          fullVersion: "0.6.0",
          default: false,
          deprecated: false,
          removed: false,
          deprecationMessage: "",
        },
        {
          id: 2,
          displayedVersion: "0.7",
          fullVersion: "0.7.0",
          default: true,
          deprecated: false,
          removed: false,
          deprecationMessage: "",
        },
      ];

      cy.mount(
        <UpgradeSyntax
          contentId={defaultProps.contentId}
          allVersions={versionsWithV7}
        />,
      );

      cy.contains("button", "Upgrade to version 0.7").should("be.visible");

      cy.checkAccessibility("body");
    });
  });
});
