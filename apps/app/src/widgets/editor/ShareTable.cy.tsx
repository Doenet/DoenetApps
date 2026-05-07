import { ShareTable } from "./ShareTable";
import { UserInfoWithEmail } from "../../types";

describe("ShareTable Component", { tags: ["@group3"] }, () => {
  const contentId = "content-123";
  const sharedUser: UserInfoWithEmail = {
    userId: "b3d9b6f6-0d8a-4b9a-8f71-5e1f3e5d4f11",
    firstNames: "Ada",
    lastNames: "Lovelace",
    email: "ada@example.com",
  };
  const inheritedUser: UserInfoWithEmail = {
    userId: "b2c84f7b-2cb1-4ae9-8fd9-1d1c0af3e227",
    firstNames: "Grace",
    lastNames: "Hopper",
    email: "grace@example.com",
  };

  it("renders shared users and is accessible", () => {
    cy.mount(
      <ShareTable
        contentId={contentId}
        isPublic={false}
        parentIsPublic={false}
        sharedWith={[sharedUser]}
        parentSharedWith={[]}
      />,
    );

    cy.contains("People with access").should("be.visible");
    cy.contains("Ada Lovelace").should("be.visible");
    cy.contains("ada@example.com").should("be.visible");
    cy.get('button[aria-label="Stop sharing with Ada Lovelace"]').should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });

  it("submits unshare actions for public and user rows", () => {
    const actionSpy = cy.spy().as("actionSpy");

    cy.mount(
      <ShareTable
        contentId={contentId}
        isPublic={true}
        parentIsPublic={false}
        sharedWith={[sharedUser]}
        parentSharedWith={[]}
      />,
      {
        action: async ({ request }) => {
          const body = await request.json();
          actionSpy(body);
          return { success: true };
        },
      },
    );

    cy.get('button[aria-label="Stop sharing publicly"]').click();
    cy.get("@actionSpy").should("have.been.calledWith", {
      path: "share/setContentIsPublic",
      contentId,
      isPublic: false,
    });

    cy.get('button[aria-label="Stop sharing with Ada Lovelace"]').click();
    cy.get("@actionSpy").should("have.been.calledWith", {
      path: "share/unshareContent",
      contentId,
      userId: sharedUser.userId,
    });
  });

  it("shows inherited rows without close buttons and is accessible", () => {
    cy.mount(
      <ShareTable
        contentId={contentId}
        isPublic={true}
        parentIsPublic={true}
        sharedWith={[inheritedUser]}
        parentSharedWith={[inheritedUser]}
      />,
    );

    cy.contains("Everyone").should("be.visible");
    cy.contains("(shared publicly)").should("be.visible");
    cy.contains("Grace Hopper").should("be.visible");
    cy.contains("grace@example.com").should("be.visible");
    cy.contains("(inherited)").should("be.visible");
    cy.get('button[aria-label="Stop sharing publicly"]').should("not.exist");
    cy.get('button[aria-label="Stop sharing with Grace Hopper"]').should(
      "not.exist",
    );

    cy.checkAccessibility("body");
  });
});
