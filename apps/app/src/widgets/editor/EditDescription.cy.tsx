import { EditDescription } from "./EditDescription";

describe("EditDescription Component", { tags: ["@group3"] }, () => {
  it("renders the saved description and is accessible", () => {
    cy.mount(
      <EditDescription
        contentId="test-content-123"
        description="Practice with the quadratic formula."
      />,
    );

    cy.get('[data-test="Description Textarea"]').should(
      "have.value",
      "Practice with the quadratic formula.",
    );
    cy.contains("36/5000").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("renders empty when there is no description", () => {
    cy.mount(
      <EditDescription contentId="test-content-123" description={null} />,
    );

    cy.get('[data-test="Description Textarea"]').should("have.value", "");
    cy.contains("0/5000").should("be.visible");
  });

  it("saves the trimmed description on blur", () => {
    const submissions: any[] = [];
    cy.mount(
      <EditDescription contentId="test-content-123" description={null} />,
      {
        action: async ({ request }) => {
          submissions.push(await request.json());
          return { success: true };
        },
      },
    );

    cy.get('[data-test="Description Textarea"]').type("  A new description  ");
    cy.get('[data-test="Description Save Status"]').should(
      "have.text",
      "Unsaved changes",
    );
    cy.get('[data-test="Description Textarea"]').blur();

    cy.get('[data-test="Description Save Status"]').should(
      "have.text",
      "Saved",
    );
    cy.wrap(submissions).should("deep.equal", [
      {
        operation: "updateDescription",
        params: {
          contentId: "test-content-123",
          description: "A new description",
        },
      },
    ]);
  });

  it("does not save when the text is unchanged", () => {
    const submissions: any[] = [];
    cy.mount(
      <EditDescription contentId="test-content-123" description="Same text" />,
      {
        action: async ({ request }) => {
          submissions.push(await request.json());
          return { success: true };
        },
      },
    );

    cy.get('[data-test="Description Textarea"]').focus().blur();
    cy.get('[data-test="Description Save Status"]').should("have.text", "");
    cy.wrap(submissions).should("have.length", 0);
  });
});
