import { ShareMyContentModal } from "./ShareMyContentModal";
import { UserInfoWithEmail } from "../types";

describe("ShareMyContentModal component tests", { tags: ["@group3"] }, () => {
  const contentId = "content-123";
  const contentType = "sequence";

  const mockUser: UserInfoWithEmail = {
    userId: "12345678-1234-1234-1234-123456789999",
    firstNames: "Test",
    lastNames: "User",
    email: "test.user@example.com",
  };

  const shareStatusData = {
    isPublic: false,
    visibility: "private",
    parentIsPublic: false,
    parentVisibility: "private",
    canSharePublicly: true,
    publicShareIssues: [],
    sharedWith: [mockUser],
    parentSharedWith: [],
  };

  const settingsData = {
    allCategories: [],
    categories: [],
    isPublic: false,
    isShared: false,
    assigned: false,
  };

  function setupMocks({
    shareStatus = shareStatusData,
    settings = settingsData,
    actionHandler,
  }: {
    shareStatus?: any;
    settings?: any;
    actionHandler?: ({ request }: { request: Request }) => any;
  } = {}) {
    return {
      action: actionHandler,
      routes: [
        {
          path: `/loadShareStatus/${contentId}`,
          loader: () => shareStatus,
        },
        {
          path: `/compoundEditor/${contentId}/settings`,
          loader: () => settings,
        },
      ],
    };
  }

  it("renders public and people sections when data is loaded", () => {
    const mountOptions = setupMocks();

    cy.mount(
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={true}
        onClose={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.contains("With the public").should("be.visible");
    cy.contains("With specific people").should("be.visible");
    cy.contains("Content is private").should("be.visible");
    cy.get('[data-test="Visibility Select"]').should("have.value", "private");
  });

  it("renders shared users in the table", () => {
    const mountOptions = setupMocks();

    cy.mount(
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={true}
        onClose={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.contains("People with access").should("be.visible");
    cy.contains("Test User").should("be.visible");
    cy.contains("test.user@example.com").should("be.visible");
  });

  it("submits add email when input loses focus", () => {
    const actionSpy = cy.spy().as("actionSpy");
    const mountOptions = setupMocks({
      shareStatus: { ...shareStatusData, sharedWith: [] },
      actionHandler: async ({ request }) => {
        const body = await request.json();
        actionSpy(body);
        return { success: true };
      },
    });

    cy.mount(
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={true}
        onClose={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.contains("Add people").should("be.visible");
    cy.get('input[name="email"]').type("new.user@example.com");
    cy.get('input[name="email"]').blur();

    cy.get("@actionSpy").should("have.been.calledWith", {
      path: "share/shareContent",
      contentId,
      email: "new.user@example.com",
    });
  });

  it("handles invalid email error without infinite rerender", () => {
    const errorMessage = "✖ Invalid email address\n  → at email";
    const mountOptions = setupMocks({
      shareStatus: { ...shareStatusData, sharedWith: [] },
      actionHandler: async () => {
        // Return error string to simulate validation error
        return errorMessage;
      },
    });

    cy.mount(
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={true}
        onClose={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.contains("Add people").should("be.visible");

    // Trigger an email submission that will error
    cy.get('input[name="email"]').type("invalid-email");
    cy.get('input[name="email"]').blur();

    // Should display the error message without crashing (would fail with infinite rerender)
    cy.contains("Invalid email address").scrollIntoView().should("be.visible");
  });

  it("submits unshare when clicking remove on a user", () => {
    const actionSpy = cy.spy().as("actionSpy");
    const mountOptions = setupMocks({
      actionHandler: async ({ request }) => {
        const body = await request.json();
        actionSpy(body);
        return { success: true };
      },
    });

    cy.mount(
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={true}
        onClose={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.contains("People with access").should("be.visible");
    cy.get('[aria-label="Stop sharing with Test User"]').click();
    cy.get("@actionSpy").should("have.been.calledWith", {
      path: "share/unshareContent",
      contentId,
      userId: mockUser.userId,
    });
  });

  it("submits visibility changes from the dropdown", () => {
    const actionSpy = cy.spy().as("actionSpy");
    const mountOptions = setupMocks({
      shareStatus: {
        ...shareStatusData,
        isPublic: false,
        visibility: "private",
      },
      actionHandler: async ({ request }) => {
        const body = await request.json();
        actionSpy(body);
        return { success: true };
      },
    });

    cy.mount(
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={true}
        onClose={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[data-test="Visibility Select"]').select("Public");
    cy.get("@actionSpy").should("have.been.calledWith", {
      path: `content/${contentId}/access`,
      visibility: "public",
    });
  });

  it("shows blocked public criteria when public visibility is unavailable", () => {
    const mountOptions = setupMocks({
      shareStatus: {
        ...shareStatusData,
        canSharePublicly: false,
        publicShareIssues: ["missingRequiredCategories", "documentErrors"],
      },
    });

    cy.mount(
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={true}
        onClose={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.contains("Cannot share publicly yet").should("be.visible");
    cy.contains("required settings").should("be.visible");
    cy.contains("Resolve document errors").should("be.visible");
    cy.get('[data-test="Visibility Select"] option[value="public"]').should(
      "be.disabled",
    );
  });

  describe("Accessibility", () => {
    it("is accessible when not public", () => {
      const mountOptions = setupMocks();

      cy.mount(
        <ShareMyContentModal
          contentId={contentId}
          contentType={contentType}
          isOpen={true}
          onClose={cy.spy().as("onClose")}
        />,
        mountOptions,
      );

      cy.contains("With the public").should("be.visible");
      cy.wait(100); // Wait for any dynamic content to load
      cy.checkAccessibility("body");
    });

    it("is accessible when public", () => {
      const mountOptions = setupMocks({
        shareStatus: {
          ...shareStatusData,
          isPublic: true,
          visibility: "public",
        },
      });

      cy.mount(
        <ShareMyContentModal
          contentId={contentId}
          contentType={contentType}
          isOpen={true}
          onClose={cy.spy().as("onClose")}
        />,
        mountOptions,
      );

      cy.contains("Content is public").should("be.visible");
      cy.wait(100); // Wait for any dynamic content to load
      cy.checkAccessibility("body");
    });

    it("is accessible with invalid email error message", () => {
      const errorMessage = "✖ Invalid email address\n  → at email";
      const mountOptions = setupMocks({
        shareStatus: { ...shareStatusData, sharedWith: [] },
        actionHandler: async () => {
          return errorMessage;
        },
      });

      cy.mount(
        <ShareMyContentModal
          contentId={contentId}
          contentType={contentType}
          isOpen={true}
          onClose={cy.spy().as("onClose")}
        />,
        mountOptions,
      );

      cy.contains("Add people").should("be.visible");

      // Trigger an email submission that will error
      cy.get('input[name="email"]').type("invalid-email");
      cy.get('input[name="email"]').blur();

      cy.contains("Invalid email address")
        .scrollIntoView()
        .should("be.visible");
      cy.wait(100); // Wait for any dynamic content to load
      cy.checkAccessibility("body");
    });
  });
});
