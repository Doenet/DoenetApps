describe("Add to compound activity tests", { tags: ["@group2"] }, () => {
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

  it("Add Document from My Activities to problem set", () => {
    createInitialSetup();

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.log("Add items to Problem Set 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set 1")
      .click();
    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");

    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add My Activities Items"]').click();

    cy.get('[data-test="Folder Title"]').should("have.text", "My Activities");
    cy.get('[data-test="Action Bar Description"]').should(
      "have.text",
      "Adding 0 items to Problem Set 1",
    );
    cy.get(`[data-test="Content Card"]`)
      .eq(0)
      .should("contain.text", "Document 1")
      .find('[data-test="Card Select"]')
      .click();

    cy.get('[data-test="Action Bar Add"]')
      .should("contain.text", "Add")
      .click();

    cy.get('[data-test="Copy Body"]').should(
      "have.text",
      "1 item added to: Problem Set 1",
    );

    cy.get('[data-test="Go to Destination"]')
      .should("have.text", "Open problem set")
      .click();

    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");
    cy.get(`[data-test="Content Card"]`).should("have.length", 3);
    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Document 1");
  });

  it("Add multiple items from My Activities to problem set", () => {
    createInitialSetup();

    cy.visit("/");

    cy.get('[data-test="My Activities"]').click();

    cy.log("Add items to Problem Set 1");
    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set 1")
      .click();
    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");

    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add My Activities Items"]').click();

    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Folder 1")
      .click();
    cy.get('[data-test="Editable Title"]').should("have.text", "Folder 1");

    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set F")
      .find('[data-test="Card Select"]')
      .click();

    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Document F2")
      .find('[data-test="Card Select"]')
      .click();

    cy.get('[data-test="Action Bar Add"]')
      .should("contain.text", "Add")
      .click();

    cy.get('[data-test="Copy Body"]').should(
      "have.text",
      "2 items added to: Problem Set 1",
    );
    cy.get('[data-test="Close Button"]').click();

    // NOTE: Currently pressing "Add" adds those items to the problem set,
    // but does not clear the current selection. This might not be the right behavior.
    cy.get('[data-test="Action Bar Description"]').should(
      "have.text",
      "Adding 2 items to Problem Set 1",
    );

    cy.log("stop adding items");

    cy.get('[data-test="Action Bar Stop adding items"]').click();
    cy.get('[data-test="Action Bar Description"]').should("not.exist");

    cy.log("Verify Problem Set 1 has new items");

    cy.go("back");

    cy.get(`[data-test="Content Card"]`)
      .eq(1)
      .should("contain.text", "Problem Set 1")
      .click();
    cy.get('[data-test="Editable Title"]').should("have.text", "Problem Set 1");
    cy.get(`[data-test="Content Card"]`).should("have.length", 4);
    cy.get(`[data-test="Content Card"]`)
      .eq(2)
      .should("contain.text", "Document FP1");
    cy.get(`[data-test="Content Card"]`)
      .eq(3)
      .should("contain.text", "Document F2");
  });

  it("Add to problem set from Explore", () => {
    createInitialSetup();

    cy.getUserInfo().then((user) => {
      cy.loginAsTestUser();

      cy.visit("/");

      cy.get('[data-test="My Activities"]').click();

      cy.log("Create new problem set, then add items from explore");
      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Problem Set Button"]').click();
      cy.get('[data-test="Editable Title"]')
        .should("have.text", "Untitled Problem Set")
        .type("A problem set{enter}");

      cy.get('[data-test="Editable Title"]').should(
        "have.text",
        "A problem set",
      );

      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Explore Items"]').click();

      cy.get('[data-test="Search"]').type(
        `${user.firstNames} ${user.lastNames}{enter}`,
      );
      cy.get('[data-test="Authors Tab"]').click();
      cy.get('[data-test="Filter By Matched Author"]')
        .eq(0)
        .should("contain.text", `${user.firstNames} ${user.lastNames}`)
        .click();

      cy.get('[data-test="Recent Content List"] [data-test="Content Card"]')
        .eq(0)
        .should("contain.text", "Folder 2");

      cy.log("Add Problem Set 1 and Problem Set From explore");

      cy.get('[data-test="Search"]').type(`Problem Set{enter}`);
      cy.get('[data-test="Searched Content List"] [data-test="Content Card"]')
        .eq(0)
        .should("contain.text", "Problem Set 1")
        .find('[data-test="Card Select"]')
        .click();

      cy.get('[data-test="Content Card"]')
        .eq(1)
        .should("contain.text", "Problem Set F")
        .find('[data-test="Card Select"]')
        .click();

      cy.get('[data-test="Add Selected To Button"]')
        .should("contain.text", "Add")
        .click();

      cy.get('[data-test="Copy Body"]').should(
        "have.text",
        "3 items added to: A problem set",
      );
      cy.get('[data-test="Go to Destination"]')
        .should("have.text", "Open problem set")
        .click();

      cy.get('[data-test="Editable Title"]').should(
        "have.text",
        "A problem set",
      );

      cy.get(`[data-test="Content Card"]`).should("have.length", 3);
      cy.get(`[data-test="Content Card"]`)
        .eq(0)
        .should("contain.text", "Document P1");
      cy.get(`[data-test="Content Card"]`)
        .eq(1)
        .should("contain.text", "Document P2");
      cy.get(`[data-test="Content Card"]`)
        .eq(2)
        .should("contain.text", "Document FP1");
    });
  });

  it("Add to problem set from Shared Activities", () => {
    createInitialSetup();

    cy.getUserInfo().then((user) => {
      cy.loginAsTestUser();

      cy.visit("/");

      cy.get('[data-test="My Activities"]').click();

      cy.log(
        "Create new problem set, then add items from shared activities found from explore",
      );
      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Problem Set Button"]').click();
      cy.get('[data-test="Editable Title"]')
        .should("have.text", "Untitled Problem Set")
        .type("My problem set{enter}");

      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Explore Items"]').click();

      cy.get('[data-test="Search"]').type(
        `${user.firstNames} ${user.lastNames}{enter}`,
        { delay: 0 },
      );
      cy.get('[data-test="Authors Tab"]').click();
      cy.get('[data-test="Author Link"]')
        .eq(0)
        .should("contain.text", `${user.firstNames} ${user.lastNames}`)
        .click();

      cy.get(`[data-test="Folder Heading"]`).should(
        "have.text",
        `Shared Activities of ${user.firstNames} ${user.lastNames}`,
      );

      cy.get('[data-test="Content Card"]')
        .eq(2)
        .should("contain.text", "Folder 1")
        .click();

      cy.get(`[data-test="Folder Heading"]`).should(
        "have.text",
        "Folder: Folder 1",
      );

      cy.log("Add Document F1 and Document F2 to My bank");
      cy.get('[data-test="Content Card"]')
        .eq(0)
        .should("contain.text", "Document F1")
        .find('[data-test="Card Select"]')
        .click();
      cy.get('[data-test="Content Card"]')
        .eq(2)
        .should("contain.text", "Document F2")
        .find('[data-test="Card Select"]')
        .click();

      cy.get('[data-test="Add Selected To Button"]')
        .should("contain.text", "Add")
        .click();

      cy.get('[data-test="Copy Body"]').should(
        "have.text",
        "2 items added to: My problem set",
      );
      cy.get('[data-test="Go to Destination"]')
        .should("have.text", "Open problem set")
        .click();

      cy.get('[data-test="Editable Title"]').should(
        "have.text",
        "My problem set",
      );

      cy.get(`[data-test="Content Card"]`).should("have.length", 2);
      cy.get(`[data-test="Content Card"]`)
        .eq(0)
        .should("contain.text", "Document F1");
      cy.get(`[data-test="Content Card"]`)
        .eq(1)
        .should("contain.text", "Document F2");
    });
  });

  it("Add to problem set from Activity Viewer", () => {
    createInitialSetup();

    cy.getUserInfo().then((user) => {
      cy.loginAsTestUser();

      cy.visit("/");

      cy.get('[data-test="My Activities"]').click();

      cy.log(
        "Create new problem set, then add items from shared activities found from explore",
      );
      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Problem Set Button"]').click();
      cy.get('[data-test="Editable Title"]')
        .should("have.text", "Untitled Problem Set")
        .type("My problem set{enter}");

      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Explore Items"]').click();

      cy.get('[data-test="Search"]').type(
        `${user.firstNames} ${user.lastNames}{enter}`,
        { delay: 0 },
      );
      cy.get('[data-test="Authors Tab"]').click();
      cy.get('[data-test="Filter By Matched Author"]')
        .eq(0)
        .should("contain.text", `${user.firstNames} ${user.lastNames}`)
        .click();

      cy.log("Add Document F2");
      cy.get('[data-test="Recent Content List"] [data-test="Content Card"]')
        .eq(1)
        .should("contain.text", "Document F2")
        .click();

      cy.iframe().find(".doenet-viewer").should("contain.text", "Hi F2");

      cy.get('[data-test="Activity Name"]').should("have.text", "Document F2");
      cy.get('[data-test="Add To"]').click();
      cy.get('[data-test="Add To Selected"]').click();

      cy.get('[data-test="Copy Body"]').should(
        "have.text",
        "1 item added to: My problem set",
      );
      cy.get('[data-test="Go to Destination"]')
        .should("have.text", "Open problem set")
        .click();

      cy.get('[data-test="Editable Title"]').should(
        "have.text",
        "My problem set",
      );

      cy.get(`[data-test="Content Card"]`).should("have.length", 1);
      cy.get(`[data-test="Content Card"]`)
        .eq(0)
        .should("contain.text", "Document F2");
    });
  });
});
