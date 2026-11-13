describe("Reading a book", { tags: ["@group3"] }, function () {
  it("a guest reads a public book page by page", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({
      name: "Sample Book",
      contentType: "folder",
      makePublic: true,
    }).then((bookId) => {
      cy.createContent({
        name: "Chapter 1",
        contentType: "folder",
        parentId: bookId,
      }).then((chapterId) => {
        cy.createContent({
          name: "1.1 First page",
          parentId: chapterId,
          doenetML: "<p>Text of the first page.</p>",
        }).then((firstId) => {
          cy.createContent({
            name: "1.2 Second page",
            parentId: chapterId,
            doenetML: `<p>Text of the second page.</p><p><ref to="doenet:${firstId}">Back to the first page</ref></p>`,
          }).then((secondId) => {
            cy.api("setIsBook", { contentId: bookId, isBook: true });

            // Read as a guest.
            cy.clearCookies();

            // Opening the book goes to its first page.
            cy.visit(`/book/${bookId}`);
            cy.url().should("include", `/book/${bookId}/${firstId}`);
            cy.get("nav[aria-label='Table of contents']")
              .filter(":visible")
              .within(() => {
                cy.contains("button", "Chapter 1").should(
                  "have.attr",
                  "aria-expanded",
                  "true",
                );
                cy.contains("a", "1.1 First page").should(
                  "have.attr",
                  "aria-current",
                  "page",
                );
              });
            cy.iframeShould("iframe", ($body) => {
              expect($body.text()).to.contain("Text of the first page.");
            });

            // Next page.
            cy.get("a[rel='next']").first().click();
            cy.url().should("include", `/book/${bookId}/${secondId}`);
            cy.iframeShould("iframe", ($body) => {
              expect($body.text()).to.contain("Text of the second page.");
            });

            // A link between pages stays in reading mode.
            cy.iframeShould("iframe", ($body) => {
              const href = $body
                .find("a")
                .filter((_, a) => a.textContent === "Back to the first page")
                .attr("href");
              expect(href).to.match(new RegExp(`/book/${bookId}/${firstId}$`));
            });

            // Reopening the book resumes where the reader left off.
            cy.visit(`/book/${bookId}`);
            cy.url().should("include", `/book/${bookId}/${secondId}`);

            // A chapter opens at its first page.
            cy.visit(`/book/${bookId}/${chapterId}`);
            cy.url().should("include", `/book/${bookId}/${firstId}`);
          });
        });
      });
    });
  });

  it("the owner can make a folder into a book from the folder page", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.createContent({ name: "Not yet a book", contentType: "folder" }).then(
      (folderId) => {
        cy.createContent({
          name: "Only page",
          parentId: folderId,
          doenetML: "<p>The only page.</p>",
        }).then((pageId) => {
          cy.getUserInfo().then((user) => {
            cy.visit(`/activities/${user.userId}/${folderId}`);
          });
          cy.get("[data-test='Read As Book Button']").click();
          cy.url().should("include", `/book/${folderId}`);
          cy.contains("isn't set up to be read as a book");

          cy.get("[data-test='Make Book Button']").click();
          cy.url().should("include", `/book/${folderId}/${pageId}`);
          cy.iframeShould("iframe", ($body) => {
            expect($body.text()).to.contain("The only page.");
          });
        });
      },
    );
  });
});
