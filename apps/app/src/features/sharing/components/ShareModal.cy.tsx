import { ShareModal } from "./ShareModal";
import { UserInfoWithEmail } from "../../../types";
import { useState } from "react";
import type { SharingData } from "../types";

describe("ShareModal component tests", { tags: ["@group3"] }, () => {
  const contentId = "content-123";
  const contentType = "sequence";

  const mockUser: UserInfoWithEmail = {
    userId: "12345678-1234-1234-1234-123456789999",
    firstNames: "Test",
    lastNames: "User",
    email: "test.user@example.com",
  };

  const shareStatusData: SharingData = {
    visibility: "private",
    parentVisibility: "private",
    canSharePublicly: true,
    publicShareIssues: [],
    sharedWith: [mockUser],
    parentSharedWith: [],
  };

  function setupMocks({
    shareStatus = shareStatusData,
    actionHandler,
  }: {
    shareStatus?: any;
    actionHandler?: ({ request }: { request: Request }) => any;
  } = {}) {
    return {
      action: actionHandler,
      routes: [
        {
          path: `/loadShareStatus/${contentId}`,
          loader: () => shareStatus,
        },
      ],
    };
  }

  it("renders public and people sections when data is loaded", () => {
    const mountOptions = setupMocks();

    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[data-test="Access Heading"]').should("contain.text", "Access");
    cy.get('[data-test="Current Access Helper"]').should(
      "contain.text",
      "Current access: Private.",
    );
    cy.contains("People").scrollIntoView().should("be.visible");
    cy.contains("Only invited users").scrollIntoView().should("be.visible");
    cy.contains("Document link").should("not.exist");
    cy.contains("Embed code").should("not.exist");
    cy.contains("Copy link").should("not.exist");
    cy.contains("Copy embed code").should("not.exist");
    cy.get('[data-test="Share Private Button"]').should(
      "have.attr",
      "aria-checked",
      "true",
    );
    cy.contains("Selected").should("not.exist");
    cy.get('[data-test="Access Unsaved Note"]').should("not.exist");
    cy.get('[data-test="Share Cancel Button"]').should("not.exist");
    cy.get('[data-test="Share Submit Button"]').should("not.exist");
  });

  it("renders shared users in the table", () => {
    const mountOptions = setupMocks();

    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.contains("Test User").scrollIntoView().should("be.visible");
    cy.contains("test.user@example.com").scrollIntoView().should("be.visible");
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
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('input[name="email"]').should(
      "have.attr",
      "placeholder",
      "Invite people with email address",
    );
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
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('input[name="email"]').should(
      "have.attr",
      "placeholder",
      "Invite people with email address",
    );

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
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[aria-label="Stop sharing with Test User"]').click();
    cy.get("@actionSpy").should("have.been.calledWith", {
      path: "share/unshareContent",
      contentId,
      userId: mockUser.userId,
    });
  });

  it("submits visibility changes from the cards", () => {
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
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[data-test="Share Publicly Button"]').click();
    cy.get('[data-test="Access Heading"]').should("contain.text", "Access");
    cy.get('[data-test="Current Access Helper"]').should(
      "contain.text",
      "Current access: Private.",
    );
    cy.get('[data-test="Access Unsaved Note"]').should(
      "contain.text",
      "Saving will make it public.",
    );
    cy.get('[data-test="Share Cancel Button"]').should(
      "contain.text",
      "Cancel",
    );
    cy.get('[data-test="Share Submit Button"]').should(
      "contain.text",
      "Save access",
    );
    cy.get('[data-test="Share Submit Button"]').click();
    cy.get("@actionSpy").should("have.been.calledWith", {
      path: `content/${contentId}/access`,
      visibility: "public",
    });
  });

  it("uses controlled mode callbacks after a successful visibility update", () => {
    const actionSpy = cy.spy().as("actionSpy");
    const onVisibilityChange = cy.spy().as("onVisibilityChange");
    const reloadShareStatus = cy.spy().as("reloadShareStatus");

    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
        onVisibilityChange={onVisibilityChange}
        refetchGroundTruth={reloadShareStatus}
        groundTruth={{
          ...shareStatusData,
          visibility: "private",
        }}
      />,
      {
        action: async ({ request }) => {
          const body = await request.json();
          actionSpy(body);
          return { status: 200 };
        },
        routes: [],
      },
    );

    cy.get('[data-test="Share Unlisted Button"]').click();
    cy.get('[data-test="Share Submit Button"]').click();

    cy.get("@actionSpy").should("have.been.calledWith", {
      path: `content/${contentId}/access`,
      visibility: "unlisted",
    });
    cy.get("@onVisibilityChange").should("have.been.calledWith", "unlisted");
    cy.get("@reloadShareStatus").should("have.been.calledOnce");
  });

  it("renders a loading state in controlled mode while share status is null", () => {
    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
        refetchGroundTruth={cy.spy().as("reloadShareStatus")}
        groundTruth={null}
      />,
    );

    cy.contains("Share problem set").should("be.visible");
    cy.contains("Loading...").should("be.visible");
    cy.get('[data-test="Access Heading"]').should("not.exist");
  });

  it("shows public criteria before allowing public access", () => {
    const mountOptions = setupMocks({
      shareStatus: {
        ...shareStatusData,
        canSharePublicly: false,
        publicShareIssues: ["missingRequiredCategories", "errorsCheckPending"],
      },
    });

    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[data-test="Share Publicly Button"]').should("not.be.disabled");
    cy.get('[data-test="Share Publicly Button"]').click();
    cy.contains(
      "2 requirements remaining before this document can be listed publicly",
    ).should(
      "contain.text",
      "2 requirements remaining before this document can be listed publicly",
    );
    cy.get('[data-test="Public Criteria Categories"]').should(
      "contain.text",
      "Categories need to be added",
    );
    cy.get('[data-test="Public Criteria Errors"]').should(
      "contain.text",
      "Syntax check needs to complete",
    );
    cy.get('[data-test="Public Criteria Accessibility"]').should(
      "contain.text",
      "No accessibility violations",
    );
    cy.contains("Open categories").should("be.visible");
    cy.contains("Open syntax errors").should("be.visible");
    cy.contains("Open syntax errors")
      .should("have.attr", "href")
      .and("equal", `/compoundEditor/${contentId}/edit`);
    cy.contains("Open accessibility violations").should("not.exist");
    cy.get('[data-test="Share Submit Button"]')
      .should("contain.text", "Save access")
      .and("be.disabled");
    cy.get('[data-test="Share Cancel Button"]').should(
      "contain.text",
      "Cancel",
    );
    cy.contains("Copy link").should("not.exist");
  });

  it("shows a public compliance warning when current public content no longer qualifies", () => {
    const mountOptions = setupMocks({
      shareStatus: {
        ...shareStatusData,
        isPublic: true,
        visibility: "public",
        canSharePublicly: false,
        publicShareIssues: ["missingRequiredCategories", "errorsCheckPending"],
      },
    });

    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[data-test="Public Compliance Warning"]').should(
      "contain.text",
      "Public content fails requirements",
    );
    cy.get('[data-test="Public Requirements Card"]').should(
      "contain.text",
      "Fix 2 requirements to restore compliance for public listing",
    );
    cy.get('[data-test="Public Criteria Categories"]').should(
      "contain.text",
      "Categories need to be added",
    );
    cy.get('[data-test="Public Criteria Errors"]').should(
      "contain.text",
      "Syntax check needs to complete",
    );
    cy.get('[data-test="Share Submit Button"]').should("not.exist");
    cy.get('[data-test="Share Cancel Button"]').should("not.exist");
  });

  it("cancels a pending visibility change", () => {
    const mountOptions = setupMocks({
      shareStatus: {
        ...shareStatusData,
        isPublic: false,
        visibility: "private",
      },
    });

    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType={contentType}
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[data-test="Share Publicly Button"]').click();
    cy.get('[data-test="Share Cancel Button"]').click();

    cy.get('[data-test="Share Private Button"]').should(
      "have.attr",
      "aria-checked",
      "true",
    );
    cy.get('[data-test="Access Unsaved Note"]').should("not.exist");
    cy.get('[data-test="Share Cancel Button"]').should("not.exist");
    cy.get('[data-test="Share Submit Button"]').should("not.exist");
    cy.get('[data-test="Public Requirements Card"]').should("not.exist");
  });

  it("reloads public requirements when reopened", () => {
    let shareStatus = {
      ...shareStatusData,
      visibility: "private",
      canSharePublicly: false,
      publicShareIssues: ["accessibilityCheck"],
    };

    const mountOptions = setupMocks({
      shareStatus,
    });

    function ReopenableModal() {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Reopen modal
          </button>
          <ShareModal
            contentId={contentId}
            contentType={contentType}
            modalIsOpen={isOpen}
            closeModal={() => setIsOpen(false)}
          />
        </>
      );
    }

    cy.mount(<ReopenableModal />, {
      ...mountOptions,
      routes: [
        {
          path: "/loadShareStatus/:contentId",
          loader: ({ params }: { params: { contentId: string } }) => {
            expect(params.contentId).to.equal(contentId);
            return { ...shareStatus };
          },
        },
        ...mountOptions.routes.slice(1),
      ],
    });

    cy.get('[data-test="Share Publicly Button"]').click();
    cy.get('[data-test="Public Requirements Card"]').should("exist");
    cy.get('[data-test="Public Compliance Warning"]').should("not.exist");
    cy.get('[data-test="Share Cancel Button"]').should(
      "contain.text",
      "Cancel",
    );
    cy.get('[data-test="Share Submit Button"]').should("be.disabled");
    cy.get('[data-test="Share Private Button"]').click();

    cy.then(() => {
      shareStatus = {
        ...shareStatusData,
        visibility: "public",
        canSharePublicly: true,
        publicShareIssues: [],
      };
    });

    cy.get('[data-test="Share Close Button"]').click();
    cy.contains("Reopen modal").click();

    cy.get('[data-test="Public Requirements Card"]').should("not.exist");
    cy.get('[data-test="Share Cancel Button"]').should("not.exist");
    cy.get('[data-test="Share Submit Button"]').should("not.exist");
  });

  it("links single document diagnostics criteria to the matching editor panel", () => {
    const mountOptions = setupMocks({
      shareStatus: {
        ...shareStatusData,
        canSharePublicly: false,
        publicShareIssues: [
          "missingRequiredCategories",
          "errorsCheck",
          "accessibilityCheck",
        ],
      },
    });

    cy.mount(
      <ShareModal
        contentId={contentId}
        contentType="singleDoc"
        modalIsOpen={true}
        closeModal={cy.spy().as("onClose")}
      />,
      mountOptions,
    );

    cy.get('[data-test="Share Publicly Button"]').click();
    cy.contains("Open syntax errors")
      .should("have.attr", "href")
      .and("equal", `/documentEditor/${contentId}/edit?diagnostics=errors`);
    cy.contains("Open accessibility violations")
      .should("have.attr", "href")
      .and(
        "equal",
        `/documentEditor/${contentId}/edit?diagnostics=accessibility`,
      );
    cy.contains("Open categories")
      .should("have.attr", "href")
      .and("equal", `/documentEditor/${contentId}/settings?showRequired`);
  });

  describe("Accessibility", () => {
    it("is accessible when not public", () => {
      const mountOptions = setupMocks();

      cy.mount(
        <ShareModal
          contentId={contentId}
          contentType={contentType}
          modalIsOpen={true}
          closeModal={cy.spy().as("onClose")}
        />,
        mountOptions,
      );

      cy.get('[data-test="Access Heading"]').should("contain.text", "Access");
      cy.get('[data-test="Current Access Helper"]').should(
        "contain.text",
        "Current access: Private.",
      );
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
        <ShareModal
          contentId={contentId}
          contentType={contentType}
          modalIsOpen={true}
          closeModal={cy.spy().as("onClose")}
        />,
        mountOptions,
      );

      cy.contains("People").should("not.exist");
      cy.contains("Document link").scrollIntoView().should("be.visible");
      cy.contains("Embed code").scrollIntoView().should("be.visible");
      cy.contains("Anyone can open the document with this link").should(
        "be.visible",
      );
      cy.contains("Copy link").should("be.visible");
      cy.contains("Copy embed code").should("be.visible");
      cy.wait(100); // Wait for any dynamic content to load
      cy.checkAccessibility("body");
    });

    it("is accessible when public compliance warning is shown", () => {
      const mountOptions = setupMocks({
        shareStatus: {
          ...shareStatusData,
          isPublic: true,
          visibility: "public",
          canSharePublicly: false,
          publicShareIssues: ["accessibilityCheck"],
        },
      });

      cy.mount(
        <ShareModal
          contentId={contentId}
          contentType={contentType}
          modalIsOpen={true}
          closeModal={cy.spy().as("onClose")}
        />,
        mountOptions,
      );

      cy.get('[data-test="Public Compliance Warning"]').should("exist");
      cy.get('[data-test="Public Requirements Card"]').should("exist");
      cy.wait(100);
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
        <ShareModal
          contentId={contentId}
          contentType={contentType}
          modalIsOpen={true}
          closeModal={cy.spy().as("onClose")}
        />,
        mountOptions,
      );

      cy.get('input[name="email"]').should(
        "have.attr",
        "placeholder",
        "Invite people with email address",
      );

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
