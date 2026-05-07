describe("Create from selected tests", { tags: ["@group3"] }, () => {
  function createInitialSetup() {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Document 1",
      contentType: "singleDoc",
      makePublic: true,
    });
    cy.createContent({
      name: "Problem Set 1",
      contentType: "sequence",
      makePublic: true,
    }).then((sequenceId) => {
      cy.createContent({
        name: "Document P1",
        contentType: "singleDoc",
        parentId: sequenceId,
        doenetML: "Hi P1",
      });
      cy.createContent({
        name: "Document P2",
        contentType: "singleDoc",
        parentId: sequenceId,
        doenetML: "Hi P2",
      });
    });
    cy.createContent({
      name: "Folder 1",
      contentType: "folder",
      makePublic: true,
    }).then((folderId) => {
      cy.createContent({
        name: "Document F1",
        contentType: "singleDoc",
        parentId: folderId,
        doenetML: "Hi F1",
      });
      cy.createContent({
        name: "Problem Set F",
        contentType: "sequence",
        parentId: folderId,
      }).then((sequenceId) => {
        cy.createContent({
          name: "Document FP1",
          contentType: "singleDoc",
          parentId: sequenceId,
          doenetML: "Hi FP1",
        });
      });
      cy.createContent({
        name: "Document F2",
        contentType: "singleDoc",
        parentId: folderId,
        doenetML: "Hi F2",
      });
    });

    cy.createContent({
      name: "Folder 2",
      contentType: "folder",
      makePublic: true,
    });
  }

  it("Create from problem set from selected document", () => {
    createInitialSetup();

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    // Create problem set from Document 1
    cy.log("Create problem set from Document 1");
    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Create From Selected Button"]').click();
    cy.get('[data-test="Create Problem Set"]').click();
    cy.get('[data-test="Created Statement"]').should(
      "have.text",
      "Problem set created with 1 item",
    );
    // new items should appear without any refresh
    cy.get(`[data-test="Content Card"]`).should("have.length", 5);
    cy.get(`[data-test="Content Card"]`)
      .eq(4)
      .should("contain.text", "Untitled Problem Set");

    cy.focused().type("Problem Set With One Document{enter}");

    cy.get(`[data-test="Content Card"]`).should("have.length", 5);
    cy.get(`[data-test="Content Card"]`)
      .eq(4)
      .should("contain.text", "Problem Set With One Document");

    cy.get('[data-test="Close Button"]').click();
    cy.get('[data-test="Created Statement"]').should("not.exist");

    cy.get(`[data-test="Content Card"]`)
      .eq(4)
      .should("contain.text", "Problem Set With One Document")
      .click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Problem Set With One Document",
    );
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1");
  });

  it("Create folder from selected folder and problem set", () => {
    createInitialSetup();

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get('[data-test="Card Select"]').eq(2).click();
    cy.get('[data-test="Card Select"]').eq(1).click();
    cy.get('[data-test="Create From Selected Button"]').click();
    cy.get('[data-test="Create Folder"]').click();
    cy.get('[data-test="Created Statement"]').should(
      "have.text",
      "Folder created with 2 items",
    );
    // new items should appear without any refresh
    cy.get(`[data-test="Content Card"]`).should("have.length", 5);
    cy.get(`[data-test="Content Card"]`)
      .eq(4)
      .should("contain.text", "Untitled Folder");

    cy.focused().type("New Folder{enter}");

    cy.get(`[data-test="Content Card"]`)
      .eq(4)
      .should("contain.text", "New Folder");

    cy.get('[data-test="Go to Created"]').click();
    cy.get('[data-test="Folder Title"]').should("have.text", "New Folder");
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Problem Set 1")
      .click();
    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");
    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document P2");

    cy.get('[data-test="Folder Breadcrumb Icon"]').click();
    cy.get('[data-test="Folder Title"]').should("have.text", "New Folder");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Folder 1")
      .click();
    cy.get('[data-test="Folder Title"]').should("have.text", "Folder 1");
    cy.get(`[data-test="Content Card"]`).should("have.length", 3);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document F1");
    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Document F2");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set F")
      .click();
    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set F");
    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document FP1");
  });

  it("Create new problem set from document inside problem set", () => {
    createInitialSetup();

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set 1")
      .click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");

    cy.get('[data-test="Card Select"]').eq(1).click();
    cy.get('[data-test="Create From Selected Button"]').click();
    cy.get('[data-test="Create Problem Set"]').click();
    cy.get('[data-test="Created Statement"]').should(
      "have.text",
      "Problem set created with 1 item",
    );
    cy.focused().type("New Problem Set{enter}");
    cy.get('[data-test="Go to Created"]').click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "New Problem Set",
    );

    cy.get(`[data-test="Content Card"]`).should("have.length", 1);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document P2");

    cy.get('[data-test="Create From Selected Button"]').should("not.exist");
  });

  it("Create from Explore", () => {
    createInitialSetup();

    cy.getUserInfo().then((user) => {
      cy.loginAsTestUser();

      cy.log("Go to explore page filtered by owner of initial content created");
      cy.visit(`/explore?author=${user.userId}`);

      cy.log("Copy Document FP1 and Problem Set 1 into new Problem Set");
      cy.get('[data-test="Recent Content List"] [data-test="Card Select"]')
        .eq(2)
        .click();
      cy.get('[data-test="Recent Content List"] [data-test="Card Select"]')
        .eq(8)
        .click();

      cy.get('[data-test="Create From Selected Button"]').click();
      cy.get('[data-test="Create Problem Set"]').click();
      cy.get('[data-test="Created Statement"]').should(
        "have.text",
        "Problem set created with 3 items",
      );
      cy.focused().type("New problem set{enter}");
      cy.get('[data-test="Go to Created"]').click();

      cy.get('[data-test="Editable Title"]').should(
        "have.text",
        "New problem set",
      );

      cy.get(`[data-test="Content Card"]`).should("have.length", 3);
      cy.get(`[data-test="Content Card"]`)
        .eq(0)
        .should("contain.text", "Document FP1");
      cy.get(`[data-test="Content Card"]`)
        .eq(1)
        .should("contain.text", "Document P1");
      cy.get(`[data-test="Content Card"]`)
        .eq(2)
        .should("contain.text", "Document P2");

      cy.get('[data-test="Folder Breadcrumb Icon"]').click();

      cy.get('[data-test="Folder Title"]').should("have.text", "My Activities");
    });
  });

  it("Create from Shared Activities", () => {
    createInitialSetup();

    cy.getUserInfo().then((user) => {
      cy.loginAsTestUser();

      cy.log("Go to shared activities of owner of initial content created");
      cy.visit(`/sharedActivities/${user.userId}`);
    });

    cy.log(
      "Copy Document F1 and Document F2 from Folder 1 into new Problem Set",
    );

    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Folder 1")
      .click();

    cy.get('[data-test="Folder Heading"]').should("contain.text", "Folder 1");

    cy.get('[data-test="Card Select"]').eq(0).click();
    cy.get('[data-test="Card Select"]').eq(2).click();

    cy.get('[data-test="Create From Selected Button"]').click();
    cy.get('[data-test="Create Problem Set"]').click();
    cy.get('[data-test="Created Statement"]').should(
      "have.text",
      "Problem set created with 2 items",
    );
    cy.focused().type("Problem set of two{enter}");
    cy.get('[data-test="Go to Created"]').click();

    cy.get('[data-test="Editable Title"]').should(
      "have.text",
      "Problem set of two",
    );

    cy.get(`[data-test="Content Card"]`).should("have.length", 2);
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document F1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Document F2");

    cy.get('[data-test="Folder Breadcrumb Icon"]').click();

    cy.get('[data-test="Folder Title"]').should("have.text", "My Activities");
  });
});
