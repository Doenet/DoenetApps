// TODO: these are just front-end tests.
// They don't need the full e2e setup with the database

import { DateTime } from "luxon";

describe("Basic accessibility tests", { tags: ["@group1"] }, function () {
  it("Check accessibility of home page", () => {
    cy.visit("/");

    cy.get("body").should("contain.text", "Doenet");

    cy.checkAccessibility(undefined);
  });

  it("Check accessibility of explore page", () => {
    cy.visit("/explore");

    cy.get("body").should("contain.text", "Community");

    cy.checkAccessibility(undefined);
  });

  it("Check accessibility of author tab in explore page", () => {
    // Make sure there is at least one author with name Test
    cy.loginAsTestUser({
      firstNames: "Test",
      lastNames: "User",
    });
    cy.createContent({
      name: "Test Content",
      makePublic: true,
    });

    cy.visit("/explore");
    cy.get('[data-test="Search"]').type("Test{enter}");

    cy.get('[data-test="Authors Tab"]').click();

    cy.get("h2").contains("Matching authors").should("be.visible");

    cy.checkAccessibility(undefined);
  });

  it("Check accessibility of classifications tab in explore page", () => {
    // Make sure there is at least one public document with a Calculus classification
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Content",
      makePublic: true,
      classifications: [
        {
          systemShortName: "HS/C Math",
          category: "Calculus - single variable",
          subCategory: "Applications of differentiation",
          code: "CalcSV.AD.17",
        },
      ],
    });

    cy.visit("/explore");
    cy.get('[data-test="Search"]').type("Calculus{enter}");

    cy.get('[data-test="Classifications Tab"]').click();

    cy.get("h2").contains("Matching classifications").should("be.visible");

    cy.checkAccessibility(undefined);
  });

  it("Check accessibility of my activities", () => {
    // Create a document, assignment, and problem set to test all icons
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Document",
      makePublic: true,
      categories: {
        isQuestion: true,
        isExploration: true,
        isGameOrPuzzle: true,
        isCollaborative: true,
        containsVideo: true,
      },
    }).then((contentId) => {
      cy.createAssignment({
        contentId,
        closedOn: DateTime.now().plus({ days: 10 }).toISO(),
      });
    });
    cy.createContent({
      name: "Test Problem Set",
      contentType: "sequence",
      categories: { isProblemSet: true, isInteractive: true },
    }).then((contentId) => {
      cy.createAssignment({
        contentId,
        closedOn: DateTime.now().plus({ days: -10 }).toISO(),
      });
    });

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();

    cy.get('[data-test="Folder Title"]').should("have.text", "My Activities");

    cy.checkAccessibility(undefined);
  });

  it("Check accessibility of my activities with search open", () => {
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Document",
    });

    cy.getUserInfo().then((user) => {
      cy.visit(`/activities/${user.userId}?q=Test`);

      cy.get('[data-test="Folder Title"]').should("have.text", "My Activities");

      cy.checkAccessibility(undefined);
    });
  });

  it("Check accessibility of my activities with item checked", () => {
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Document",
    });

    cy.getUserInfo().then((user) => {
      cy.visit(`/activities/${user.userId}`);

      cy.get('[data-test="Card Select"]').eq(0).click();
      cy.get('[data-test="Create From Selected Button"]').should("be.visible");

      cy.checkAccessibility(undefined);
    });
  });

  it("Check accessibility of assigned to me page", () => {
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Document",
      doenetML: "1+1 = <answer name='ans'>2</answer>",
    }).then((contentId) => {
      cy.createAssignment({
        contentId,
        closedOn: DateTime.now().plus({ days: 10 }).toISO(),
      }).then(({ classCode }) => {
        cy.loginAsTestUser();

        cy.visit(`/code/${classCode}`);

        cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
          cy.get("#ans textarea").type("2{enter}", { force: true });
        });

        cy.get('[data-test="Assigned to Me"]').click();

        cy.get('[data-test="Assigned Activities"]').should("be.visible");

        cy.checkAccessibility(undefined);
      });
    });
  });

  it("Check accessibility of activity viewer with document", () => {
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Document",
      doenetML:
        "<m>1+1 =</m> <answer name='ans'>2</answer><p><selectFromSequence /></p>",
      makePublic: true,
    }).then((contentId) => {
      cy.visit(`/activityViewer/${contentId}`);

      cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
        cy.get(".doenet-viewer").should("contain.text", "1 +1 =");
      });

      cy.checkAccessibility(undefined);
    });
  });

  it("Check accessibility of activity viewer with problem set", () => {
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Problem Set",
      contentType: "sequence",
      makePublic: true,
    }).then((contentId) => {
      cy.createContent({
        name: "Test Document 1",
        doenetML: "<m>1+1 =</m> <answer name='ans'>2</answer>",
        parentId: contentId,
      });
      cy.createContent({
        name: "Test Document 2",
        doenetML: "<m>2+2 =</m> <answer name='ans'>4</answer>",
        parentId: contentId,
      });

      cy.visit(`/activityViewer/${contentId}`);

      cy.getIframeBody("iframe:eq(0)", ".doenet-viewer").within(() => {
        cy.get(".doenet-viewer").should("contain.text", "1 +1 =");
      });

      cy.getIframeBody("iframe:eq(1)", ".doenet-viewer").within(() => {
        cy.get(".doenet-viewer").should("contain.text", "2 +2 =");
      });

      cy.checkAccessibility(undefined);
    });
  });

  it("Check accessibility of activity document editor", () => {
    cy.loginAsTestUser();
    cy.createContent({
      name: "Test Document",
      doenetML:
        "<m>1+1 =</m> <answer name='ans'>2</answer><p><selectFromSequence /></p>",
      makePublic: true,
    }).then((contentId) => {
      cy.visit(`/activityViewer/${contentId}`);

      cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
        cy.get(".doenet-viewer").should("contain.text", "1 +1 =");
      });

      cy.get('[data-test="Edit Mode Button"]').click();

      cy.getIframeBody("iframe", ".cm-content").within(() => {
        cy.get(".cm-line").should(
          "contain.text",
          "<m>1+1 =</m> <answer name='ans'>2</answer>",
        );
      });
      cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
        cy.get(".doenet-viewer").should("contain.text", "1 +1 =");
      });

      cy.checkAccessibility(undefined);
    });
  });

  it("Check accessibility of scratch pad", () => {
    cy.visit(`/scratchPad`);

    cy.getIframeBody("iframe", ".doenet-viewer").within(() => {
      cy.get(".doenet-viewer").should("contain.text", "scratch pad");
    });

    cy.checkAccessibility(undefined);
  });
});
