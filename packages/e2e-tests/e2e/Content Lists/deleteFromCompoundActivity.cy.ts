describe("Delete from compound activity tests", { tags: ["@group3"] }, () => {
  it("Delete document from problem set", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Problem Set 1", contentType: "sequence" }).then(
      (sequenceId) => {
        cy.createContent({
          name: "Document P1",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
        cy.createContent({
          name: "Document P2",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
        cy.createContent({
          name: "Document P3",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
      },
    );

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set 1")
      .click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");
    cy.get(`[data-test="Content Card"]`).should("have.length", 3);

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Confirm Delete Message"]').should(
      "contain.text",
      "Document P1",
    );
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P2");
  });

  it("Delete multiple documents sequentially from problem set", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Problem Set 1", contentType: "sequence" }).then(
      (sequenceId) => {
        cy.createContent({
          name: "Document P1",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
        cy.createContent({
          name: "Document P2",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
        cy.createContent({
          name: "Document P3",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
      },
    );

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set 1")
      .click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");
    cy.get(`[data-test="Content Card"]`).should("have.length", 3);

    // Delete Document P1
    cy.log("Delete Document P1");
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Confirm Delete Message"]').should(
      "contain.text",
      "Document P1",
    );
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P2");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document P3");

    // Delete Document P2 (second deletion from same problem set)
    cy.log("Delete Document P2");
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Confirm Delete Message"]').should(
      "contain.text",
      "Document P2",
    );
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P3");
  });

  it("Delete all documents from problem set", () => {
    cy.loginAsTestUser();

    cy.createContent({
      name: "Empty Problem Set",
      contentType: "sequence",
    }).then((sequenceId) => {
      cy.createContent({
        name: "Document A",
        contentType: "singleDoc",
        parentId: sequenceId,
      });
      cy.createContent({
        name: "Document B",
        contentType: "singleDoc",
        parentId: sequenceId,
      });
    });

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Empty Problem Set")
      .click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Empty Problem Set",
    );
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);

    // Delete Document A
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);

    // Delete Document B
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Confirm Delete Message"]').should(
      "contain.text",
      "Document B",
    );
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 0);
  });
});
