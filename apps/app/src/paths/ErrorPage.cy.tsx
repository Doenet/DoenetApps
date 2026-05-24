import {
  NotFoundErrorContent,
  AccessDeniedErrorContent,
  GenericErrorContent,
} from "./ErrorPage";

describe("ErrorPage components", { tags: ["@group1"] }, () => {
  describe("NotFoundErrorContent", () => {
    it("renders with correct title and description", () => {
      cy.mount(
        <NotFoundErrorContent onGoHome={() => {}} onExplore={() => {}} />,
      );

      cy.get('[data-test="Error Title"]').should("contain", "Page Not Found");
      cy.contains(
        "ask the author to share it with you or make it public",
      ).should("be.visible");
      cy.contains("Go to Home").should("be.visible");
      cy.contains("Explore Public Content").should("be.visible");
      cy.checkAccessibility("body");
    });

    it("calls onGoHome when Go to Home is clicked", () => {
      const onGoHome = cy.stub();

      cy.mount(
        <NotFoundErrorContent onGoHome={onGoHome} onExplore={() => {}} />,
      );

      cy.contains("Go to Home").click();
      cy.then(() => {
        expect(onGoHome.called).to.be.true;
      });
    });

    it("calls onExplore when Explore Public Content is clicked", () => {
      const onExplore = cy.stub();

      cy.mount(
        <NotFoundErrorContent onGoHome={() => {}} onExplore={onExplore} />,
      );

      cy.contains("Explore Public Content").click();
      cy.then(() => {
        expect(onExplore.called).to.be.true;
      });
    });
  });

  describe("AccessDeniedErrorContent", () => {
    it("renders with correct title and description", () => {
      cy.mount(
        <AccessDeniedErrorContent onGoHome={() => {}} onExplore={() => {}} />,
      );

      cy.get('[data-test="Error Title"]').should("contain", "Access Denied");
      cy.contains(
        "Ask the author to share it with you or make it public",
      ).should("be.visible");
      cy.contains("Go to Home").should("be.visible");
      cy.contains("Explore Public Content").should("be.visible");
      cy.checkAccessibility("body");
    });

    it("calls onGoHome when Go to Home is clicked", () => {
      const onGoHome = cy.stub();

      cy.mount(
        <AccessDeniedErrorContent onGoHome={onGoHome} onExplore={() => {}} />,
      );

      cy.contains("Go to Home").click();
      cy.then(() => {
        expect(onGoHome.called).to.be.true;
      });
    });

    it("calls onExplore when Explore Public Content is clicked", () => {
      const onExplore = cy.stub();

      cy.mount(
        <AccessDeniedErrorContent onGoHome={() => {}} onExplore={onExplore} />,
      );

      cy.contains("Explore Public Content").click();
      cy.then(() => {
        expect(onExplore.called).to.be.true;
      });
    });
  });

  describe("GenericErrorContent", () => {
    it("renders with correct title and description", () => {
      cy.mount(<GenericErrorContent onGoHome={() => {}} />);

      cy.get('[data-test="Error Title"]').should(
        "contain",
        "Something Went Wrong",
      );
      cy.contains("An unexpected error occurred").should("be.visible");
      cy.contains("Go to Home").should("be.visible");
      cy.checkAccessibility("body");
    });

    it("calls onGoHome when Go to Home is clicked", () => {
      const onGoHome = cy.stub();

      cy.mount(<GenericErrorContent onGoHome={onGoHome} />);

      cy.contains("Go to Home").click();
      cy.then(() => {
        expect(onGoHome.called).to.be.true;
      });
    });
  });
});
