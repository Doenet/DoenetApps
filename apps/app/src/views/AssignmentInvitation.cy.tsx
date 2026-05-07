import { AssignmentInvitation } from "./AssignmentInvitation";

describe("Assignment Invitation Modal", { tags: ["@group3"] }, () => {
  const assignmentName = "Sample Assignment";
  const classCode = "ABC123";

  beforeEach(() => {
    // Intercept the logo image request to prevent 404 errors
    cy.intercept("/Doenet_Logo_Frontpage.png", {});
  });

  it("renders correctly and is accessible", () => {
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AssignmentInvitation
        isOpen={true}
        onClose={onCloseSpy}
        classCode={classCode}
        assignmentName={assignmentName}
        assignmentStatus="Open"
      />,
    );

    cy.get("header").should("contain.text", assignmentName);

    cy.get(".chakra-portal").should("contain.text", `/code/${classCode}`);

    cy.wait(100); // Wait, otherwise a11y check gets the wrong contrast on the text

    cy.checkAccessibility(".chakra-portal");
  });

  it("copies the URL when clicking Copy URL", () => {
    const onCloseSpy = cy.spy().as("onClose");

    let expectedUrl: string;

    cy.window().then((win) => {
      const writeTextStub = cy.stub().as("writeTextStub");

      if (win.navigator.clipboard && "writeText" in win.navigator.clipboard) {
        cy.stub(win.navigator.clipboard, "writeText").callsFake(writeTextStub);
      } else {
        Object.defineProperty(win.navigator, "clipboard", {
          value: { writeText: writeTextStub },
          configurable: true,
        });
      }

      expectedUrl = `${win.location.protocol}//${win.location.host}/code/${classCode}`;
      cy.wrap(expectedUrl).as("expectedUrl");
    });

    cy.mount(
      <AssignmentInvitation
        isOpen={true}
        onClose={onCloseSpy}
        classCode={classCode}
        assignmentName={assignmentName}
        assignmentStatus="Open"
      />,
    );

    cy.contains("button", "Copy URL").click();

    cy.get("@expectedUrl").then((url) => {
      cy.get("@writeTextStub").should("have.been.calledOnce");
      cy.get("@writeTextStub").should("have.been.calledWith", url);
    });
    cy.contains("button", "URL copied").should("exist");
  });
});
