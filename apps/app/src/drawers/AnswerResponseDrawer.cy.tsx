import { AnswerResponseDrawer } from "./AnswerResponseDrawer";
import { DateTime } from "luxon";

describe("AnswerResponseDrawer component tests", { tags: ["@group1"] }, () => {
  it("renders something for math", () => {
    // Note: this test merely checks that there is an SVG rendered by MathJax
    const responses = [
      {
        answerCreditAchieved: 0,
        response: `{"response":["x"],"componentTypes":["math"]}`,
        submittedAt: "2026-01-01T14:00:00Z",
      },
      {
        answerCreditAchieved: 1,
        response: `{"response":[["^", "y", 2]],"componentTypes":["math"]}`,
        submittedAt: "2026-01-01T14:01:00Z",
      },
    ];
    cy.intercept("/api/assign/getStudentSubmittedResponses/*/*", {
      responses,
    }).as("getData");

    cy.mount(
      <AnswerResponseDrawer
        isOpen={true}
        onClose={() => {}}
        itemName={null}
        assignment={{
          name: "Sample Assignment",
          type: "singleDoc",
          contentId: "xyz",
        }}
        student={{
          userId: "student1",
          firstNames: "Student",
          lastNames: "One",
        }}
        answerId={"answer123"}
        itemNumber={1}
        shuffledOrder={false}
        contentAttemptNumber={1}
        itemAttemptNumber={null}
      />,
    );

    cy.get("tbody > tr:nth-of-type(1) > td")
      .eq(0)
      .find("mjx-container[jax='SVG']")
      .should("exist");
    cy.get("tbody > tr:nth-of-type(1) > td").eq(1).should("have.text", "0%");
    cy.get("tbody > tr:nth-of-type(1) > td")
      .eq(2)
      .should(
        "have.text",
        DateTime.fromISO(responses[0].submittedAt).toLocaleString(
          DateTime.DATETIME_MED,
        ),
      );

    cy.get("tbody > tr:nth-of-type(2) > td")
      .eq(0)
      .find("mjx-container[jax='SVG']")
      .should("exist");
    cy.get("tbody > tr:nth-of-type(2) > td").eq(1).should("have.text", "100%");
    cy.get("tbody > tr:nth-of-type(2) > td")
      .eq(2)
      .should(
        "have.text",
        DateTime.fromISO(responses[1].submittedAt).toLocaleString(
          DateTime.DATETIME_MED,
        ),
      );

    cy.checkAccessibility("body");
  });

  it("renders text correctly", () => {
    const responses = [
      {
        answerCreditAchieved: 0,
        response: `{"response":["hello"],"componentTypes":["text"]}`,
        submittedAt: "2026-01-01T14:00:00Z",
      },
      {
        answerCreditAchieved: 1,
        response: `{"response":["world"],"componentTypes":["text"]}`,
        submittedAt: "2026-01-01T14:01:00Z",
      },
    ];
    cy.intercept("/api/assign/getStudentSubmittedResponses/*/*", {
      responses,
    }).as("getData");

    cy.mount(
      <AnswerResponseDrawer
        isOpen={true}
        onClose={() => {}}
        itemName={null}
        assignment={{
          name: "Sample Assignment",
          type: "singleDoc",
          contentId: "xyz",
        }}
        student={{
          userId: "student1",
          firstNames: "Student",
          lastNames: "One",
        }}
        answerId={"answer123"}
        itemNumber={1}
        shuffledOrder={false}
        contentAttemptNumber={1}
        itemAttemptNumber={null}
      />,
    );

    cy.get("tbody > tr:nth-of-type(1) > td").eq(0).should("have.text", "hello");
    cy.get("tbody > tr:nth-of-type(1) > td").eq(1).should("have.text", "0%");
    cy.get("tbody > tr:nth-of-type(1) > td")
      .eq(2)
      .should(
        "have.text",
        DateTime.fromISO(responses[0].submittedAt).toLocaleString(
          DateTime.DATETIME_MED,
        ),
      );

    cy.get("tbody > tr:nth-of-type(2) > td").eq(0).should("have.text", "world");
    cy.get("tbody > tr:nth-of-type(2) > td").eq(1).should("have.text", "100%");
    cy.get("tbody > tr:nth-of-type(2) > td")
      .eq(2)
      .should(
        "have.text",
        DateTime.fromISO(responses[1].submittedAt).toLocaleString(
          DateTime.DATETIME_MED,
        ),
      );
    cy.checkAccessibility("body");
  });

  it("multiple part response", () => {
    // Prevent MathJax async typesetting errors from failing the test
    Cypress.on("uncaught:exception", (err) => {
      // Return false to prevent the error from failing this test
      if (
        err.message.includes("Typesetting failed") ||
        err.message.includes("Cannot read properties of null")
      ) {
        return false;
      }
      return true;
    });

    const responses = [
      {
        answerCreditAchieved: 0.5,
        response: `{"response":["hello", ["^", "x", 2]],"componentTypes":["text", "math"]}`,
        submittedAt: "2026-01-01T14:00:00Z",
      },
    ];

    cy.intercept("/api/assign/getStudentSubmittedResponses/*/*", {
      responses,
    }).as("getData");

    cy.mount(
      <AnswerResponseDrawer
        isOpen={true}
        onClose={() => {}}
        itemName={null}
        assignment={{
          name: "Sample Assignment",
          type: "singleDoc",
          contentId: "xyz",
        }}
        student={{
          userId: "student1",
          firstNames: "Student",
          lastNames: "One",
        }}
        answerId={"answer123"}
        itemNumber={1}
        shuffledOrder={false}
        contentAttemptNumber={1}
        itemAttemptNumber={null}
      />,
    );

    cy.get("tbody > tr:nth-of-type(1) > td")
      .eq(0)
      .should("contain.text", "hello");
    cy.get("tbody > tr:nth-of-type(1) > td")
      .eq(0)
      .find("mjx-container[jax='SVG']")
      .should("exist");
    cy.get("tbody > tr:nth-of-type(1) > td").eq(1).should("have.text", "50%");
    cy.get("tbody > tr:nth-of-type(1) > td")
      .eq(2)
      .should(
        "have.text",
        DateTime.fromISO(responses[0].submittedAt).toLocaleString(
          DateTime.DATETIME_MED,
        ),
      );
    cy.checkAccessibility("body");
  });
});
