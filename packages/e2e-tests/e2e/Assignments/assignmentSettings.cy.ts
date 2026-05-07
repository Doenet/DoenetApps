import { toMathJaxString } from "@doenet-tools/shared";

describe("Assignment settings Tests", { tags: ["@group1"] }, function () {
  it("number of attempts changed via stepper is saved immediately", () => {
    cy.loginAsTestUser({
      isAuthor: true,
    });

    cy.createContent({
      name: "Assignment",
      contentType: "singleDoc",
      doenetML: `<m>x + x =</m> <answer>2x</answer>`,
    }).then((activityId) => {
      cy.visit(`/documentEditor/${activityId}/edit`);

      // wait for MathJax to have rendered
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", toMathJaxString("x+x ="));

      // increase number of attempts to 3
      cy.get('[data-test="Settings Button"]').click();
      cy.get('[data-test="max-attempts-input"]')
        .find("[role='button']")
        .first()
        .click()
        .click();
      cy.get('[data-test="max-attempts-input"]')
        .find("input")
        .should("have.value", "3");

      // Immediately navigate away
      cy.get('[data-test="Edit Mode Button"]').click();

      // wait for MathJax to have rendered
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", toMathJaxString("x+x ="));

      // Navigate back to settings
      cy.get('[data-test="Settings Button"]').click();
      // Verify number of attempts is still 3
      cy.get('[data-test="max-attempts-input"]')
        .find("input")
        .should("have.value", "3");
    });
  });
});
