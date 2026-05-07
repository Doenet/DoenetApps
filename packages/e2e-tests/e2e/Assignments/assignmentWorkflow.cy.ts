import { UserInfo } from "@doenet-tools/shared";
import { toMathJaxString } from "@doenet-tools/shared";
import { DateTime } from "luxon";

describe("Assignment workflow Tests", function () {
  it(
    "instructor creates assignment, anonymous user takes it, instructor views data",
    { tags: ["@brittle2"] },
    () => {
      const code = Date.now().toString();
      const instructorEmail = `test${code}@doenet.org`;
      cy.loginAsTestUser({
        isAuthor: true,
        email: instructorEmail,
        firstNames: "Instructor",
        lastNames: "One",
      });

      let classCode: number | null = null;
      let studentUser: UserInfo | null = null;
      let studentUser2: UserInfo | null = null;

      // Instructor creates document
      cy.visit("/");
      cy.get('[data-test="My Activities"]').click();
      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Document Button"]').click();

      // change title
      cy.get('[data-test="Editable Title"]').should(
        "have.text",
        "Untitled Document",
      );
      cy.get('[data-test="Editable Title"]').type("Assignment{enter}");

      // add answer blank
      cy.iframe()
        .find(".cm-activeLine")
        .type('<m>x+x =</m> <answer name="ans">2x</answer>{enter}');

      cy.iframe().find('[data-test="Viewer Update Button"]').click();

      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", toMathJaxString("x+x ="));

      // increase number of attempts to 3
      cy.get('[data-test="Settings Button"]').click();
      cy.get('[data-test="max-attempts-input"] input').type(
        "{selectall}3{enter}",
      );

      cy.get('[data-test="Edit Mode Button"]').click();
      // wait for MathJax to have rendered
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", toMathJaxString("x+x ="));

      cy.reload();

      // wait for MathJax to have rendered
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", toMathJaxString("x+x ="));

      // Create an assignment from the document
      cy.get('[data-test="Create Assignment"]').click();

      // Verify number of attempts is still 3
      cy.get('[data-test="max-attempts-input"]')
        .find("input")
        .should("have.value", "3");

      // Confirm create assignment
      cy.get('[data-test="Confirm Create Assignment"]').click();

      // Save in My Activities
      cy.get('[data-test="Execute MoveCopy Button"]').click();

      // wait a moment and make sure that we don't have error page
      // (checking for a bug where used a fetcher twice)
      cy.wait(200);
      cy.get('[data-test="Execute MoveCopy Button"]').should("not.exist");
      cy.iframe()
        .find(".doenet-viewer")
        .should("contain.text", toMathJaxString("x+x ="));

      // Navigate to My Activities to find assignment
      cy.get('[data-test="My Activities"]').click();
      cy.get(`[data-test="Content Card"]`).eq(1).click();
      cy.get('[data-test="Class Code"]')
        .invoke("text")
        .then((text) => {
          classCode = parseInt(text);
        });

      // Log in as anonymous user to take assignment
      cy.loginAsTestUser({
        isAnonymous: true,
      });

      cy.getUserInfo().then((user) => {
        studentUser = user;

        // Visit assignment
        cy.visit(`/code/${classCode}`);

        // Verify have 3 attempts (i.e., 2 left after initial)
        cy.get("#viewer-container").find("button").first().contains("2 left");

        // Submit an incorrect answer for this attempt
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get("#ans textarea").type("3x{enter}", { force: true });

          cy.get("#ans .mq-editable-field").should("contain.text", "3x");
        });

        // Get a new attempt
        cy.get("#viewer-container").find("button").first().click();
        cy.get("#viewer-container").find("button").first().contains("1 left");

        // Wait so that don't get element that will be removed
        cy.wait(500);

        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          // Verify answer is now blank
          cy.get("#ans .mq-editable-field").should("not.contain.text", "3x");

          // Submit an incorrect answer at first
          cy.get("#ans textarea").type("4x{enter}", { force: true });

          cy.get("#ans .mq-editable-field").should("contain.text", "4x");

          // Then submit a correct answer
          cy.get("#ans textarea").type("{end}{backspace}{backspace}2x{enter}", {
            force: true,
          });

          cy.get("#ans .mq-editable-field").should("not.contain.text", "4x");

          cy.get("#ans .mq-editable-field").should("contain.text", "2x");
        });

        // Get third and final attempt
        cy.get("#viewer-container").find("button").first().click();
        cy.get("#viewer-container")
          .find("button")
          .first()
          .should("be.disabled")
          .contains("0 left");

        // Wait so that don't get element that will be removed
        cy.wait(500);

        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          // Verify answer is now blank
          cy.get("#ans .mq-editable-field").should("not.contain.text", "2x");

          // Submit an incorrect answer
          cy.get("#ans textarea").type("5x{enter}", { force: true });

          cy.get("#ans .mq-editable-field").should("contain.text", "5x");
        });
      });

      // Log in as second anonymous user to take assignment
      cy.loginAsTestUser({
        isAnonymous: true,
      });

      cy.getUserInfo().then((user) => {
        studentUser2 = user;

        // Visit assignment
        cy.visit(`/code/${classCode}`);

        // Verify have 3 attempts (i.e., 2 left after initial)
        cy.get("#viewer-container").find("button").first().contains("2 left");

        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          // Submit an incorrect answer for this attempt
          cy.get("#ans textarea").type("6x{enter}", { force: true });

          cy.get("#ans .mq-editable-field").should("contain.text", "6x");
        });
      });

      // Log back in as instructor to view data
      cy.loginAsTestUser({
        email: instructorEmail,
      }).then(() => {
        // make asynchronous so that can access studentUser and classCode

        cy.visit("/");
        // Navigate to My Activities to find assignment
        cy.get('[data-test="My Activities"]').click();
        cy.get(`[data-test="Content Card"]`).eq(1).click();

        cy.get(`td:contains("${studentUser!.lastNames}")`).click();

        cy.get('[data-test="Title"]').should("contain.text", `Student Summary`);
        cy.get('[data-test="Student Select"]').should(
          "have.value",
          `${studentUser!.userId}`,
        );

        cy.get('[data-test="Overall Score"]').should("contain.text", `100`);

        cy.get('[data-test="Attempt Number 1"]').should("contain.text", "1");
        cy.get('[data-test="Attempt Total 1"]').should("contain.text", "0");

        cy.get('[data-test="Attempt Number 2"]').should("contain.text", "2");
        cy.get('[data-test="Attempt Total 2"]').should("contain.text", "100");

        cy.get('[data-test="Attempt Number 3"]').should("contain.text", "3");
        cy.get('[data-test="Attempt Total 3"]').should("contain.text", "0");

        cy.get('[data-test="Attempt Total 2"]').click();

        cy.get('[data-test="Title"]').should("contain.text", `Item Details`);

        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get("#ans .mq-editable-field").should("contain.text", "2x");
        });
        cy.get('[data-test="Attempt Select"]').select("3");

        cy.wait(500); // wait for iframe to update
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get("#ans .mq-editable-field").should("contain.text", "5x");
        });

        // switch to second student
        cy.get('[data-test="Student Select"]').select(
          `${studentUser2!.lastNames}`,
        );

        cy.get('[data-test="Attempt Select"]').should("have.value", `1`);

        cy.wait(500); // wait for iframe to update
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get("#ans .mq-editable-field").should("contain.text", "6x");
        });

        cy.get('[data-test="Back Link"]').click();

        cy.get('[data-test="Title"]').should("contain.text", `Student Summary`);
        cy.get('[data-test="Student Select"]').select(
          `${studentUser2!.lastNames}`,
        );

        cy.get('[data-test="Overall Score"]').should("contain.text", `0`);

        cy.get('[data-test="Back Link"]').click();

        // Download scores CSV and verify contents
        cy.get('[data-test="Download Scores Button"]').click();

        cy.readFile(`cypress/downloads/Scores for Assignment.csv`).then(
          (fileContent) => {
            expect(fileContent).to.include(
              `"${studentUser!.lastNames}","${studentUser!.userId}",100`,
            );
            expect(fileContent).to.include(
              `"${studentUser2!.lastNames}","${studentUser2!.userId}",0`,
            );
          },
        );
      });
    },
  );

  it(
    "Anonymous user takes problem set assignment, instructor view data",
    { tags: ["@brittle3"] },
    () => {
      const code = Date.now().toString();
      const instructorEmail = `test${code}@doenet.org`;
      cy.loginAsTestUser({
        isAuthor: true,
        email: instructorEmail,
        firstNames: "Instructor",
        lastNames: "One",
      });

      let classCode: number | null = null;
      let studentUser: UserInfo | null = null;
      let studentUser2: UserInfo | null = null;

      cy.createContent({ name: "Problem Set", contentType: "sequence" }).then(
        (problemSetId) => {
          cy.createContent({
            name: "Problem 1",
            contentType: "singleDoc",
            doenetML: `<m>x + x =</m> <answer name="ans">2x</answer>`,
            parentId: problemSetId,
          });

          cy.createContent({
            name: "Problem 2",
            contentType: "singleDoc",
            doenetML: `<m>y + y =</m> <answer name="ans">2y</answer>`,
            parentId: problemSetId,
          });

          // Create an assignment from the problem set
          cy.createAssignment({
            contentId: problemSetId,
            closedOn: DateTime.now().plus({ days: 7 }).toISO(),
            maxAttempts: 2,
          }).then(({ classCode: cc }) => {
            classCode = cc;
          });
        },
      );

      // Log in as anonymous user to take assignment
      cy.loginAsTestUser({
        isAnonymous: true,
      });

      cy.getUserInfo().then((user) => {
        studentUser = user;

        // Visit assignment
        cy.visit(`/code/${classCode}`);

        cy.getIframeBody("iframe:eq(0)", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer").should(
            "contain.text",
            toMathJaxString("x+x ="),
          );

          // Enter incorrect answer in first problem
          cy.get("#ans textarea").type("3x{enter}", { force: true });

          cy.get("#ans .mq-editable-field").should("contain.text", "3x");

          // Enter correct answer in first problem
          cy.get("#ans textarea").type("{end}{backspace}{backspace}2x{enter}", {
            force: true,
          });

          cy.get("#ans .mq-editable-field").should("contain.text", "2x");
        });

        cy.getIframeBody("iframe:eq(1)", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer").should(
            "contain.text",
            toMathJaxString("y+y ="),
          );

          // Enter incorrect answer in second problem
          cy.get("#ans textarea").type("3y{enter}", { force: true });

          cy.get("#ans .mq-editable-field").should("contain.text", "3y");
        });

        // Get new attempt of first question
        cy.get("[data-test='New Item Attempt']").eq(0).click();
        cy.get("[data-test='Confirm Create New Attempt']").click();

        cy.wait(500);

        // For some reason, the first iframe is scrolling out of view after the new attempt
        // which means it isn't initializing
        // TODO: is there some way to prevent it from scrolling out of view?
        cy.get("iframe").eq(0).scrollIntoView();

        // Verify first problem answer is now blank
        cy.getIframeBody("iframe:eq(0)", ".doenet-viewer").within(() => {
          cy.get("#ans .mq-editable-field").should("not.contain.text", "2x");
        });

        // Verify second problem answer is still correct
        cy.getIframeBody("iframe:eq(1)", ".doenet-viewer").within(() => {
          cy.get("#ans .mq-editable-field").should("contain.text", "3y");
        });

        // Submit incorrect answer for first problem
        cy.getIframeBody("iframe:eq(0)", ".doenet-viewer").within(() => {
          cy.get("#ans textarea").type("4x{enter}", { force: true });
          cy.get("#ans .mq-editable-field").should("contain.text", "4x");
        });

        // Get new attempt of second question
        cy.get("[data-test='New Item Attempt']").eq(1).click();
        cy.get("[data-test='Confirm Create New Attempt']").click();

        cy.wait(500);

        // For some reason, the second iframe is scrolling out of view after the new attempt
        // which means it isn't initializing
        // TODO: is there some way to prevent it from scrolling out of view?
        cy.get("iframe").eq(1).scrollIntoView();

        cy.getIframeBody("iframe:eq(1)", ".doenet-viewer").within(() => {
          // Verify second problem answer is now blank
          cy.get("#ans .mq-editable-field").should("not.contain.text", "3y");

          // Submit correct answer for second problem
          cy.get("#ans textarea").type("2y{enter}", { force: true });
          cy.get("#ans .mq-editable-field").should("contain.text", "2y");
        });
      });

      // Log in as second anonymous user
      cy.loginAsTestUser({
        isAnonymous: true,
      });

      cy.getUserInfo().then((user) => {
        studentUser2 = user;

        // Visit assignment
        cy.visit(`/code/${classCode}`);

        cy.getIframeBody("iframe:eq(0)", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer").should(
            "contain.text",
            toMathJaxString("x+x ="),
          );
        });

        cy.getIframeBody("iframe:eq(1)", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer").should(
            "contain.text",
            toMathJaxString("y+y ="),
          );

          // Submit correct answers for just second problem
          cy.get("#ans textarea").type("2y{enter}", { force: true });

          cy.get("#ans .mq-editable-field").should("contain.text", "2y");
        });
      });

      // Log back in as instructor to view data
      cy.loginAsTestUser({
        email: instructorEmail,
      }).then(() => {
        // make asynchronous so that can access studentUser and classCode

        cy.visit("/");
        // Navigate to My Activities to find assignment
        cy.get('[data-test="My Activities"]').click();
        cy.get(`[data-test="Content Card"]`).eq(1).click();

        cy.get(`[data-test="Student Row ${studentUser2!.userId}"]`).within(
          () => {
            cy.get('[data-test="Total Score"]').should("contain.text", `50`);
            cy.get('[data-test="Item 1 Score"]').should("contain.text", `0`);
            cy.get('[data-test="Item 2 Score"]').should("contain.text", `100`);
          },
        );

        cy.get(`[data-test="Student Row ${studentUser!.userId}"]`).within(
          () => {
            cy.get('[data-test="Total Score"]').should("contain.text", `100`);
            cy.get('[data-test="Item 1 Score"]').should("contain.text", `100`);

            // Select item 2 of first student
            cy.get('[data-test="Item 2 Score"]')
              .should("contain.text", `100`)
              .click();
          },
        );

        // Should go to attempt 2 of item 2, which is correct answer of 2y
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer #ans .mq-editable-field").should(
            "contain.text",
            "2y",
          );
        });

        // Switch to attempt 1, which is incorrect answer of 3y
        cy.get('[data-test="Attempt Select"]').select("1");
        cy.wait(500);
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer #ans .mq-editable-field").should(
            "contain.text",
            "3y",
          );
        });

        // Switch to item 1, which will have first attempt and correct answer of 2x
        cy.get('[data-test="Item Select"]').select("1");
        cy.wait(500);
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer #ans .mq-editable-field").should(
            "contain.text",
            "2x",
          );
        });

        // Switch to second student
        cy.get(`[data-test="Student Select"]`).select(
          `${studentUser2!.userId}`,
        );
        cy.wait(500);

        // item one is unanswered, so should be blank
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer #ans .mq-editable-field").should(
            "not.contain.text",
            "x",
          );
        });

        // Switch to item 2 which will have correct answer of 2y
        cy.get('[data-test="Item Select"]').select("2");
        cy.wait(500);
        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get(".doenet-viewer #ans .mq-editable-field").should(
            "contain.text",
            "2y",
          );
        });
      });
    },
  );
});
