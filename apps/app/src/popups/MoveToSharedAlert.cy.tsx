import MoveToSharedAlert from "./MoveToSharedAlert";

describe("MoveToSharedAlert component tests", { tags: ["@group2"] }, () => {
  it("shows modal when open", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.contains("Confirm move to shared parent").should("be.visible");
  });

  it("does not show modal when closed", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={false}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.contains("Confirm move to shared parent").should("not.exist");
  });

  it("displays parent name in modal", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="My Shared Project"
      />,
    );

    cy.contains("My Shared Project").should("be.visible");
  });

  it("displays warning message about sharing", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.contains("is shared.").should("be.visible");
    cy.contains(
      "Moving here will share the content with the same people",
    ).should("be.visible");
  });

  it("displays back button", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Back Button"]').should("contain.text", "Back");
  });

  it("displays confirm button", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Confirm Button"]').should(
      "contain.text",
      "Confirm Move",
    );
  });

  it("closes modal when back button is clicked", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Back Button"]').click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("does not call performMove when back button is clicked", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Back Button"]').click();

    cy.get("@performMove").should("not.have.been.called");
  });

  it("calls performMove when confirm button is clicked", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Confirm Button"]').click();

    cy.get("@performMove").should("have.been.calledOnce");
  });

  it("closes modal when confirm button is clicked", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Confirm Button"]').click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("calls performMove then onClose in correct order", () => {
    const callOrder: string[] = [];
    const onCloseSpy = cy.spy(() => callOrder.push("close"));
    const performMoveSpy = cy.spy(() => callOrder.push("performMove"));

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Confirm Button"]').click();

    cy.then(() => {
      expect(callOrder).to.deep.equal(["performMove", "close"]);
    });
  });

  it("closes modal when close button is clicked", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    // Chakra's ModalCloseButton is the X button in the header
    cy.get("button[aria-label='Close']").click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("does not call performMove when close button is clicked", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get("button[aria-label='Close']").click();

    cy.get("@performMove").should("not.have.been.called");
  });

  it("handles parent name with special characters", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName={"Shared & Project's Test"}
      />,
    );

    cy.contains("Shared & Project's Test").should("be.visible");
  });

  it("handles parent name with very long text", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    const longName =
      "This is a very long parent folder name that should still display properly in the modal";

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName={longName}
      />,
    );

    cy.contains(longName).should("be.visible");
  });

  it("handles null parent name", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName={null}
      />,
    );

    cy.contains("Confirm move to shared parent").should("be.visible");
  });

  it("displays warning icon", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    // WarningIcon is rendered in the header
    cy.get('[data-test="Confirm Header"]').should("exist");
  });

  it("displays modal body with correct data-test attribute", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.get('[data-test="Confirm Body"]').should("exist");
  });

  it("displays information about target location", () => {
    const onCloseSpy = cy.spy().as("onClose");
    const performMoveSpy = cy.spy().as("performMove");

    cy.mount(
      <MoveToSharedAlert
        isOpen={true}
        onClose={onCloseSpy}
        performMove={performMoveSpy}
        parentName="Shared Folder"
      />,
    );

    cy.contains("The target location").should("be.visible");
  });

  describe("Accessibility tests", () => {
    it("should be accessible with simple parent name", () => {
      const onCloseSpy = cy.spy().as("onClose");
      const performMoveSpy = cy.spy().as("performMove");

      cy.mount(
        <MoveToSharedAlert
          isOpen={true}
          onClose={onCloseSpy}
          performMove={performMoveSpy}
          parentName="Shared Folder"
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with long parent name", () => {
      const onCloseSpy = cy.spy().as("onClose");
      const performMoveSpy = cy.spy().as("performMove");

      const longName =
        "This is a very long parent folder name that should still display properly in the modal";

      cy.mount(
        <MoveToSharedAlert
          isOpen={true}
          onClose={onCloseSpy}
          performMove={performMoveSpy}
          parentName={longName}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with null parent name", () => {
      const onCloseSpy = cy.spy().as("onClose");
      const performMoveSpy = cy.spy().as("performMove");

      cy.mount(
        <MoveToSharedAlert
          isOpen={true}
          onClose={onCloseSpy}
          performMove={performMoveSpy}
          parentName={null}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });

    it("should be accessible with special characters in parent name", () => {
      const onCloseSpy = cy.spy().as("onClose");
      const performMoveSpy = cy.spy().as("performMove");

      cy.mount(
        <MoveToSharedAlert
          isOpen={true}
          onClose={onCloseSpy}
          performMove={performMoveSpy}
          parentName={"Shared & Project's Test"}
        />,
      );

      cy.wait(200);
      cy.checkAccessibility("body");
    });
  });
});
