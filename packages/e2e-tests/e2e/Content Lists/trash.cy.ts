describe("Trash tests", { tags: ["@group3"] }, () => {
  it("Delete document", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Document 1", contentType: "singleDoc" });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Confirm Delete Message"]').should(
      "contain.text",
      "The document Document 1 will be deleted forever after 30 days",
    );
    cy.get('[data-test="Delete Button"]').click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 0);
  });

  it("Cancel delete document", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Document 1", contentType: "singleDoc" });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Cancel Button"]').click();
    cy.get('[data-test="Confirm Delete Message"]').should("not.exist");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
  });

  it("Delete document and recover from trash", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Document 1", contentType: "singleDoc" });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Delete Button"]').click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 0);

    cy.get('[data-test="Trash Link"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Action Bar Restore"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 0);

    cy.get('[data-test="My Activities Link"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
  });

  it("Delete content, delete parent folder, then undelete content", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Folder 1", contentType: "folder" }).then(
      (folderId) => {
        cy.createContent({
          name: "Document 1",
          contentType: "singleDoc",
          parentId: folderId,
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

    cy.get(`[data-test="Folder Title"]`).should("have.text", "Folder 1");

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    // Delete Document 1
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 0);

    // Go to Activities and delete Folder 1
    cy.get('[data-test="My Activities Link"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 0);

    // Go to Trash and undelete Document 1
    cy.get('[data-test="Trash Link"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document 1");

    cy.get('[data-test="Card Select"]').eq(1).click();
    cy.get('[data-test="Action Bar Restore"]').click();

    // Go to Activities and check that Document 1 is there
    // (Not in folder since folder was deleted)
    cy.get('[data-test="My Activities Link"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");

    // Undelete Folder 1
    cy.get('[data-test="Trash Link"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Action Bar Restore"]').click();

    // Go to Activities and check that Folder 1 is there
    cy.get('[data-test="My Activities Link"]').click();

    // Document 1 is no longer in folder, so both items should be in Activities
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document 1");

    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1")
      .click();

    // Folder 1 is empty
    cy.get(`[data-test="Folder Title"]`).should("have.text", "Folder 1");
    cy.get(`[data-test="Content Card"]`).should("have.length", 0);
  });

  it("Delete and undelete folder with contents", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Folder 1", contentType: "folder" }).then(
      (folderId) => {
        cy.createContent({
          name: "Document 1",
          contentType: "singleDoc",
          parentId: folderId,
        });
      },
    );
    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1");

    // Delete Folder 1
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to trash"]').click();
    cy.get('[data-test="Delete Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 0);

    // Go to Trash and undelete Folder 1
    cy.get('[data-test="Trash Link"]').click();

    // Document 1 should not be in the trash directly
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Action Bar Restore"]').click();

    // Go to Activities and check that Folder 1 and Document 1 are there
    cy.get('[data-test="My Activities Link"]').click();
    cy.get('[data-test="Folder Title"]').should("have.text", "My Activities");

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder 1")
      .click();

    cy.get(`[data-test="Folder Title"]`).should("have.text", "Folder 1");

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
  });
});
