describe("Image upload", { tags: ["@group3"] }, function () {
  it("uploads an image from + New, shows the card, and copies the image tag", () => {
    cy.loginAsTestUser({ isAuthor: true, canUploadImages: true });

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();
    cy.get('[data-test="New Button"]').should("be.visible");
    cy.get('[data-test="Content Card"]').should("not.exist");

    cy.fixture("tiny.png.base64", "utf8").then((base64) => {
      const fileContents = Cypress.Buffer.from(base64.trim(), "base64");

      cy.get('[data-test="New Button"]').click();
      cy.get('[data-test="Add Image Button"]').click();

      cy.get('[data-test="Hidden Image Upload Input"]').selectFile(
        {
          contents: fileContents,
          fileName: "tiny.png",
          mimeType: "image/png",
          lastModified: Date.now(),
        },
        { force: true },
      );
    });

    cy.get('[data-test="Content Card"]', { timeout: 10000 })
      .should("have.length", 1)
      .and("contain.text", "tiny.png");

    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText")
        .as("clipboardWrite")
        .resolves();
    });

    cy.get('[data-test="Copy Image Tag"]').click();

    cy.get("@clipboardWrite").should((stub) => {
      const writeText = stub as unknown as sinon.SinonStub;
      expect(writeText.callCount).to.equal(1);
      const arg = writeText.firstCall.args[0] as string;
      expect(arg).to.match(
        /^<image source="https?:\/\/[^"]+\/api\/media\/[A-Za-z0-9_-]{22}" \/>$/,
      );
    });
  });

  it("shows the early-access prompt when canUploadImages is false", () => {
    cy.loginAsTestUser({ isAuthor: true });

    cy.visit("/");
    cy.get('[data-test="My Activities"]').click();
    cy.get('[data-test="New Button"]').click();
    cy.get('[data-test="Add Image Button"]').click();

    cy.contains("Image uploads are in early access").should("be.visible");
    cy.get('[data-test="Content Card"]').should("not.exist");
  });
});
