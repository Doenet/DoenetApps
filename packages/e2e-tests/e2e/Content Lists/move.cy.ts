describe("Move tests", { tags: ["@group3"] }, () => {
  it("Move items up and down", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Document", contentType: "singleDoc" });
    cy.createContent({ name: "Problem Set", contentType: "sequence" });
    cy.createContent({ name: "Folder", contentType: "folder" });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 3);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set");
    cy.get(`[data-test="Content Card"]`).eq(2).should("contain.text", "Folder");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move up"]').should("be.disabled");
    cy.get('[aria-label="Move down"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 3);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document");
    cy.get(`[data-test="Content Card"]`).eq(2).should("contain.text", "Folder");

    cy.get('[aria-label="Move up"]').should("not.be.disabled");
    cy.get('[aria-label="Move down"]').click();
    cy.get(`[data-test="Content Card"]`).should("have.length", 3);

    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set");
    cy.get(`[data-test="Content Card"]`).eq(1).should("contain.text", "Folder");
    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Document");

    cy.get('[aria-label="Move down"]').should("be.disabled");
    cy.get('[aria-label="Move up"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 3);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document");
    cy.get(`[data-test="Content Card"]`).eq(2).should("contain.text", "Folder");
  });

  it("Move document into problem set", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Document", contentType: "singleDoc" });
    cy.createContent({ name: "Problem Set", contentType: "sequence" }).then(
      (sequenceId) => {
        cy.createContent({
          name: "Document P",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
      },
    );
    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to"]').click();

    cy.get('[data-test="MoveCopy Heading 2"]').should("have.text", "Document");

    cy.get('[data-test="Select Item Option"]').should("have.length", 2);
    cy.get('[data-test="Select Item Option"]')
      .eq(0)
      .should("have.text", "Problem Set")
      .should("not.be.disabled");
    cy.get('[data-test="Select Item Option"]')
      .eq(1)
      .should("have.text", "Document")
      .should("be.disabled");

    cy.get('[data-test="Select Item Option"]').eq(0).click();
    cy.get('[data-test="Current destination"]').should(
      "have.text",
      "Problem Set",
    );

    cy.get('[data-test="Execute MoveCopy Button"]').click();
    cy.get('[data-test="MoveCopy Body"]').should(
      "have.text",
      "1 item moved to: Problem Set",
    );
    cy.get('[data-test="Go to Destination"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document");
  });

  it("Move problem set into sub folder", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Problem Set", contentType: "sequence" }).then(
      (sequenceId) => {
        cy.createContent({
          name: "Document P1",
          contentType: "singleDoc",
          parentId: sequenceId,
        });
      },
    );
    cy.createContent({ name: "Folder", contentType: "folder" }).then(
      (folderId) => {
        cy.createContent({
          name: "Document F1",
          contentType: "singleDoc",
          parentId: folderId,
        });
        cy.createContent({
          name: "Folder F",
          contentType: "folder",
          parentId: folderId,
        });
      },
    );

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to"]').click();

    cy.get('[data-test="MoveCopy Heading 2"]').should(
      "have.text",
      "Problem Set",
    );

    cy.get('[data-test="Select Item Option"]').should("have.length", 2);
    cy.get('[data-test="Select Item Option"]')
      .eq(0)
      .should("have.text", "Problem Set")
      .should("be.disabled");
    cy.get('[data-test="Select Item Option"]')
      .eq(1)
      .should("have.text", "Folder")
      .should("not.be.disabled");

    cy.get('[data-test="Select Item Option"]').eq(1).click();
    cy.get('[data-test="Current destination"]').should("have.text", "Folder");
    cy.get('[data-test="Select Item Option"]').should("have.length", 2);

    cy.get('[data-test="Select Item Option"]')
      .eq(0)
      .should("have.text", "Folder F")
      .should("not.be.disabled")
      .click();

    cy.get('[data-test="Current destination"]').should("have.text", "Folder F");
    cy.get('[data-test="Select Item Option"]').should("have.length", 0);
    cy.get('[data-test="Execute MoveCopy Button"]').click();
    cy.get('[data-test="MoveCopy Body"]').should(
      "have.text",
      "1 item moved to: Folder F",
    );
    cy.get('[data-test="Close Button"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Folder")
      .click();

    cy.get('[data-test="Folder Title"]').should("have.text", "Folder");
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Folder F")
      .click();

    cy.get('[data-test="Folder Title"]').should("have.text", "Folder F");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set")
      .click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P1");
  });

  it("Move problem set in folder into My Activities", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Folder", contentType: "folder" }).then(
      (folderId) => {
        cy.createContent({
          name: "Problem Set",
          contentType: "sequence",
          parentId: folderId,
        }).then((sequenceId) => {
          cy.createContent({
            name: "Document P",
            contentType: "singleDoc",
            parentId: sequenceId,
          });
        });
      },
    );
    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);

    cy.get('[data-test="Content Card"]')
      .eq(0)
      .should("contain.text", "Folder")
      .click();

    cy.get('[data-test="Folder Title"]').should("have.text", "Folder");

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to"]').click();

    cy.get('[data-test="MoveCopy Heading 2"]').should(
      "have.text",
      "Problem Set",
    );
    cy.get('[data-test="Current destination"]').should("have.text", "Folder");

    cy.get('[data-test="Select Item Option"]').should("have.length", 1);
    cy.get('[data-test="Select Item Option"]')
      .eq(0)
      .should("have.text", "Problem Set")
      .should("be.disabled");

    cy.get('[data-test="Back Arrow"]').click();
    cy.get('[data-test="Current destination"]').should(
      "have.text",
      "My Activities",
    );

    cy.get('[data-test="Execute MoveCopy Button"]').click();
    cy.get('[data-test="MoveCopy Body"]').should(
      "have.text",
      "1 item moved to: My Activities",
    );
    cy.get('[data-test="Go to Destination"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`).eq(0).should("contain.text", "Folder");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set")
      .click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P");
  });

  it("Move item to public parent", () => {
    cy.loginAsTestUser();

    cy.createContent({ name: "Document", contentType: "singleDoc" });
    cy.createContent({
      name: "Problem Set",
      contentType: "sequence",
      makePublic: true,
    });

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set");

    cy.log("Move Document into public Problem Set");
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[aria-label="Move to"]').click();

    cy.get('[data-test="Select Item Option"]').should("have.length", 2);
    cy.get('[data-test="Select Item Option"]')
      .eq(0)
      .should("have.text", "Problem Set")
      .should("not.be.disabled");
    cy.get('[data-test="Select Item Option"]')
      .eq(1)
      .should("have.text", "Document")
      .should("be.disabled");

    cy.get('[data-test="Select Item Option"]').eq(0).click();
    cy.get('[data-test="Select Item Option"]').should("have.length", 0);

    cy.get('[data-test="Empty Message"]').should(
      "have.text",
      "This item is empty.",
    );
    cy.get('[data-test="Execute MoveCopy Button"]').click();
    cy.get('[data-test="Confirm Header"]').should(
      "contain.text",
      "Confirm move to shared parent",
    );
    cy.get('[data-test="Confirm Body"]').should(
      "contain.text",
      "The target locationProblem Setis shared.",
    );
    cy.get('[data-test="Confirm Body"]').should(
      "contain.text",
      "Moving here will share the content with the same people.",
    );

    cy.get('[data-test="Back Button"]').click();
    cy.get('[data-test="Confirm Header"]').should("not.exist");
    cy.get('[data-test="Execute MoveCopy Button"]').click();
    cy.get('[data-test="Confirm Header"]').should(
      "contain.text",
      "Confirm move to shared parent",
    );
    cy.get('[data-test="Confirm Button"]').click();

    cy.get('[data-test="MoveCopy Body"]').should(
      "have.text",
      "1 item moved to: Problem Set",
    );

    cy.get('[data-test="Go to Destination"]').click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document");
  });
});
