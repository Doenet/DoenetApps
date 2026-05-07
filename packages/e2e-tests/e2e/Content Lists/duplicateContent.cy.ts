describe("Duplicate content Tests", { tags: ["@group3"] }, function () {
  it("Duplicate Document, in My Activities", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Document 1",
      contentType: "singleDoc",
      doenetML: "Hi Doc 1",
    });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Action Bar Make a copy"]').eq(0).click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Copy of Document 1")
      .click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Copy of Document 1",
    );
    cy.iframe().find(".doenet-viewer").contains("Hi Doc 1");
  });

  it("Duplicate Document, in Folder", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({ name: "Folder 1", contentType: "folder" }).then(
      (folderId) => {
        cy.createContent({
          name: "Document 1",
          contentType: "singleDoc",
          parentId: folderId,
          doenetML: "Hi Doc 1",
        });
      },
    );

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1")
      .click();

    cy.get('[data-test="Folder Title"]').should("have.text", "Folder 1");

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Action Bar Make a copy"]').eq(0).click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Copy of Document 1")
      .click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Copy of Document 1",
    );
    cy.iframe().find(".doenet-viewer").contains("Hi Doc 1");
  });

  it("Duplicate Problem Set", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({ name: "Document 1", contentType: "singleDoc" });
    cy.createContent({ name: "Problem Set 1", contentType: "sequence" }).then(
      (sequenceId) => {
        cy.createContent({
          name: "Document P1",
          contentType: "singleDoc",
          parentId: sequenceId,
          doenetML: "Hi P1",
        });
      },
    );
    cy.createContent({ name: "Document 2", contentType: "singleDoc" });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 3);

    cy.get('[data-test="Card Select"]').eq(1).click();
    cy.get('[data-test="Action Bar Make a copy"]').click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 3);

    cy.get(`[data-test="Content Card"]`)
      .eq(3)
      .should("contain.text", "Copy of Problem Set 1")
      .click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Copy of Problem Set 1",
    );

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P1")
      .click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Document P1");
    cy.iframe().find(".doenet-viewer").contains("Hi P1");
  });

  it("Duplicate Folder with contents", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({ name: "Folder 1", contentType: "folder" }).then(
      (folderId) => {
        cy.createContent({
          name: "Document F1",
          contentType: "singleDoc",
          parentId: folderId,
        });
        cy.createContent({
          name: "Problem Set F",
          contentType: "sequence",
          parentId: folderId,
        }).then((sequenceId) => {
          cy.createContent({
            name: "Document F",
            contentType: "singleDoc",
            parentId: sequenceId,
          });
        });
      },
    );

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Action Bar Make a copy"]').click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Copy of Folder 1")
      .click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Copy of Folder 1",
    );

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document F1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set F")
      .click();
    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set F");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document F");
  });
});
