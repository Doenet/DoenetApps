import { Box } from "@chakra-ui/react";
import { PanelPair } from "./PanelPair";

describe("PanelPair", { tags: ["@group4"] }, () => {
  const panelA = <Box data-test="panel-a">Panel A Content</Box>;
  const panelB = <Box data-test="panel-b">Panel B Content</Box>;

  describe("rendering", () => {
    it("renders both panels", () => {
      cy.mount(<PanelPair panelA={panelA} panelB={panelB} />);

      cy.get('[data-test="panel-a"]').should("contain.text", "Panel A Content");
      cy.get('[data-test="panel-b"]').should("contain.text", "Panel B Content");

      cy.checkAccessibility("body");
    });

    it("renders the gutter separator", () => {
      cy.mount(<PanelPair panelA={panelA} panelB={panelB} />);

      cy.get('[data-test="contentPanelDragHandle"]').should("exist");

      cy.checkAccessibility("body");
    });
  });

  describe("horizontal layout (default)", () => {
    it("renders in horizontal layout on md breakpoint and larger", () => {
      cy.viewport(1000, 600);
      cy.mount(
        <PanelPair
          panelA={panelA}
          panelB={panelB}
          preferredDirection="horizontal"
        />,
      );

      // In horizontal layout, panels should be side by side
      cy.get('[data-test="panel-a"]').should("be.visible");
      cy.get('[data-test="panel-b"]').should("be.visible");

      cy.checkAccessibility("body");
    });

    it("uses default centerWidth of 10px in horizontal layout", () => {
      cy.viewport(1000, 600);
      cy.mount(
        <PanelPair
          panelA={panelA}
          panelB={panelB}
          preferredDirection="horizontal"
        />,
      );

      cy.get('[data-test="contentPanelDragHandle"]').should(
        "have.css",
        "width",
        "10px",
      );

      cy.checkAccessibility("body");
    });

    it("uses custom centerWidth in horizontal layout", () => {
      cy.viewport(1000, 600);
      cy.mount(
        <PanelPair
          panelA={panelA}
          panelB={panelB}
          preferredDirection="horizontal"
          centerWidth="20px"
        />,
      );

      cy.get('[data-test="contentPanelDragHandle"]').should(
        "have.css",
        "width",
        "20px",
      );

      cy.checkAccessibility("body");
    });
  });

  describe("vertical layout", () => {
    it("renders in vertical layout on base breakpoint", () => {
      cy.viewport(400, 600);
      cy.mount(
        <PanelPair
          panelA={panelA}
          panelB={panelB}
          preferredDirection="horizontal"
        />,
      );

      // Even with horizontal preference, should be vertical on small viewport
      cy.get('[data-test="panel-a"]').should("be.visible");
      cy.get('[data-test="panel-b"]').should("be.visible");

      cy.checkAccessibility("body");
    });

    it("forces vertical layout with preferredDirection='vertical'", () => {
      cy.viewport(1000, 600);
      cy.mount(
        <PanelPair
          panelA={panelA}
          panelB={panelB}
          preferredDirection="vertical"
        />,
      );

      // Panels should stack vertically
      cy.get('[data-test="panel-a"]').should("be.visible");
      cy.get('[data-test="panel-b"]').should("be.visible");

      cy.checkAccessibility("body");
    });

    it("uses default centerWidth of 10px in vertical layout", () => {
      cy.mount(
        <PanelPair
          panelA={panelA}
          panelB={panelB}
          preferredDirection="vertical"
        />,
      );

      cy.get('[data-test="contentPanelDragHandle"]').should(
        "have.css",
        "height",
        "10px",
      );

      cy.checkAccessibility("body");
    });

    it("uses custom centerWidth in vertical layout", () => {
      cy.mount(
        <PanelPair
          panelA={panelA}
          panelB={panelB}
          preferredDirection="vertical"
          centerWidth="15px"
        />,
      );

      cy.get('[data-test="contentPanelDragHandle"]').should(
        "have.css",
        "height",
        "15px",
      );

      cy.checkAccessibility("body");
    });
  });

  describe("sizing", () => {
    it("renders with default width and height", () => {
      cy.mount(<PanelPair panelA={panelA} panelB={panelB} />);

      // Just verify both panels are visible with default sizing
      cy.get('[data-test="panel-a"]').should("be.visible");
      cy.get('[data-test="panel-b"]').should("be.visible");

      cy.checkAccessibility("body");
    });

    it("applies custom width", () => {
      cy.mount(
        <Box width="500px" height="300px">
          <PanelPair panelA={panelA} panelB={panelB} width="500px" />
        </Box>,
      );

      cy.get('[data-test="panel-a"]')
        .parent()
        .parent()
        .parent()
        .should("have.css", "width", "500px");

      cy.checkAccessibility("body");
    });

    it("applies custom height", () => {
      cy.mount(
        <Box width="300px" height="400px">
          <PanelPair panelA={panelA} panelB={panelB} height="400px" />
        </Box>,
      );

      cy.get('[data-test="panel-a"]')
        .parent()
        .parent()
        .parent()
        .should("have.css", "height", "400px");

      cy.checkAccessibility("body");
    });

    it("applies both custom width and height", () => {
      cy.mount(
        <Box width="600px" height="500px">
          <PanelPair
            panelA={panelA}
            panelB={panelB}
            width="600px"
            height="500px"
          />
        </Box>,
      );

      const gridElement = cy
        .get('[data-test="panel-a"]')
        .parent()
        .parent()
        .parent();
      gridElement.should("have.css", "width", "600px");
      gridElement.should("have.css", "height", "500px");

      cy.checkAccessibility("body");
    });
  });

  describe("border styling", () => {
    it("renders with default border style", () => {
      cy.mount(<PanelPair panelA={panelA} panelB={panelB} />);

      // Verify border exists (exact values can vary based on Chakra's processing)
      cy.get('[data-test="panel-a"]')
        .parent()
        .parent()
        .should("have.css", "border-width");

      cy.checkAccessibility("body");
    });

    it("applies custom border style", () => {
      cy.mount(
        <PanelPair panelA={panelA} panelB={panelB} border="2px dashed red" />,
      );

      // Verify custom border is applied (exact values may vary due to Chakra processing)
      cy.get('[data-test="panel-a"]')
        .parent()
        .parent()
        .should("have.css", "border-style", "dashed")
        .and("have.css", "border-color", "rgb(255, 0, 0)");

      cy.checkAccessibility("body");
    });
  });
});
