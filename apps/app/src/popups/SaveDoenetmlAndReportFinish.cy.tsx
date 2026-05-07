import { SaveDoenetmlAndReportFinish } from "./SaveDoenetmlAndReportFinish";
import { UserInfoWithEmail } from "../types";
import { FetcherWithComponents } from "react-router";

type CreateContentResponse = {
  status: number;
  data?: {
    contentId: string;
  };
  message?: string;
};

function createMockFetcher(
  state: "idle" | "loading",
  data?: CreateContentResponse,
): FetcherWithComponents<CreateContentResponse> {
  return {
    state,
    data,
    formData: undefined,
    json: undefined,
    text: undefined,
    formAction: undefined,
    formMethod: undefined,
    formEncType: undefined,
    submit: cy.stub().as("fetcherSubmit"),
    load: cy.stub(),
    reset: cy.stub(),
    Form: (() => null) as any,
  } as FetcherWithComponents<CreateContentResponse>;
}

function getDefaultProps() {
  const mockUser: UserInfoWithEmail = {
    userId: "user123",
    email: "test@example.com",
    firstNames: "Test",
    lastNames: "User",
  };

  return {
    isOpen: true,
    onClose: cy.spy().as("onClose"),
    DoenetML: "<p>Test DoenetML content</p>",
    documentName: "My Test Document",
    navigate: cy.spy().as("navigate"),
    user: mockUser,
    setAddTo: cy.spy().as("setAddTo"),
    fetcher: createMockFetcher("idle"),
  };
}

describe(
  "SaveDoenetmlAndReportFinish component tests",
  { tags: ["@group2"] },
  () => {
    it("shows modal when open", () => {
      const props = getDefaultProps();

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.contains("Saving...").should("be.visible");
    });

    it("does not show modal when closed", () => {
      const props = getDefaultProps();
      props.isOpen = false;

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.contains("Saving...").should("not.exist");
    });

    it("displays saving state initially", () => {
      const props = getDefaultProps();

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Copy Header"]').should("contain.text", "Saving...");
      cy.get('[data-test="Copy Body"]').should("contain.text", "Saving...");
    });

    it("submits fetcher when modal opens", () => {
      const props = getDefaultProps();

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get("@fetcherSubmit").should("have.been.calledOnce");
      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "updateContent/createContent",
        parentId: null,
        contentType: "singleDoc",
        doenetml: "<p>Test DoenetML content</p>",
        name: "My Test Document",
      });
    });

    it("submits with correct options", () => {
      const props = getDefaultProps();

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get("@fetcherSubmit").should(
        "have.been.calledWith",
        Cypress.sinon.match.any,
        { method: "post", encType: "application/json" },
      );
    });

    it("disables buttons during saving", () => {
      const props = getDefaultProps();

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Go to Destination"]').should("be.disabled");
      cy.get('[data-test="Close Button"]').should("be.disabled");
    });

    it("hides close button during saving", () => {
      const props = getDefaultProps();

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get("button[aria-label='Close']").should("not.exist");
    });

    it("displays success state when save completes", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Copy Header"]').should(
        "contain.text",
        "Save finished",
      );
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "Successfully saved to new document",
      );
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "My Test Document",
      );
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "in My Activities",
      );
    });

    it("enables buttons after successful save", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Go to Destination"]').should("not.be.disabled");
      cy.get('[data-test="Close Button"]').should("not.be.disabled");
    });

    it("shows close button after successful save", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get("button[aria-label='Close']").should("exist");
    });

    it("displays error state when save fails", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 400,
        message: "Database error",
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Copy Header"]').should(
        "contain.text",
        "An error occurred",
      );
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "An error occurred while saving: Database error",
      );
    });

    it("displays error state without message", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 500,
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Copy Header"]').should(
        "contain.text",
        "An error occurred",
      );
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "An error occurred while saving.",
      );
    });

    it("enables buttons after error", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 400,
        message: "Error",
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Go to Destination"]').should("not.be.disabled");
      cy.get('[data-test="Close Button"]').should("not.be.disabled");
    });

    it("calls onClose when close button is clicked", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Close Button"]').click();

      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("calls onClose when modal X button is clicked", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get("button[aria-label='Close']").click();

      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("calls navigate and setAddTo when go to destination button is clicked", () => {
      const props = getDefaultProps();
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Go to Destination"]').click();

      cy.get("@navigate").should("have.been.calledOnce");
      cy.get("@navigate").should("have.been.calledWith", "/activities/user123");
      cy.get("@setAddTo").should("have.been.calledOnce");
      cy.get("@setAddTo").should("have.been.calledWith", null);
      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("displays correct destination URL based on user ID", () => {
      const props = getDefaultProps();
      props.user = {
        userId: "differentUser",
        email: "other@example.com",
        firstNames: "Other",
        lastNames: "User",
      };
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Go to Destination"]').click();

      cy.get("@navigate").should(
        "have.been.calledWith",
        "/activities/differentUser",
      );
    });

    it("displays go to destination button with correct text", () => {
      const props = getDefaultProps();

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Go to Destination"]').should(
        "contain.text",
        "Go to My Activities",
      );
    });

    it("handles document name with special characters", () => {
      const props = getDefaultProps();
      props.documentName = 'Document & Test\'s "Name"';
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        'Document & Test\'s "Name"',
      );
    });

    it("handles very long document name", () => {
      const props = getDefaultProps();
      props.documentName =
        "This is a very long document name that should still display properly in the modal";
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "This is a very long document name that should still display properly in the modal",
      );
    });

    it("handles undefined user", () => {
      const props = getDefaultProps();
      props.user = undefined as any;
      props.fetcher = createMockFetcher("idle", {
        status: 200,
        data: { contentId: "content123" },
      });

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Go to Destination"]').click();

      cy.get("@navigate").should(
        "have.been.calledWith",
        "/activities/undefined",
      );
    });

    it("handles empty DoenetML string", () => {
      const props = getDefaultProps();
      props.DoenetML = "";

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get("@fetcherSubmit").should(
        "have.been.calledWith",
        Cypress.sinon.match({ doenetml: "" }),
      );
    });

    it("displays error when document name is empty", () => {
      const props = getDefaultProps();
      props.documentName = "";

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get('[data-test="Copy Header"]').should(
        "contain.text",
        "An error occurred",
      );
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "Document name cannot be empty.",
      );
    });

    it("does not submit when document name is empty", () => {
      const props = getDefaultProps();
      props.documentName = "";

      cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

      cy.get("@fetcherSubmit").should("not.have.been.called");
    });

    describe("Accessibility tests", () => {
      it("should be accessible during saving state", () => {
        const props = getDefaultProps();

        cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible in success state", () => {
        const props = getDefaultProps();
        props.fetcher = createMockFetcher("idle", {
          status: 200,
          data: { contentId: "content123" },
        });

        cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible in error state", () => {
        const props = getDefaultProps();
        props.fetcher = createMockFetcher("idle", {
          status: 400,
          message: "Database error",
        });

        cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible with long document name", () => {
        const props = getDefaultProps();
        props.documentName =
          "This is a very long document name that should still display properly";
        props.fetcher = createMockFetcher("idle", {
          status: 200,
          data: { contentId: "content123" },
        });

        cy.mount(<SaveDoenetmlAndReportFinish {...props} />);

        cy.wait(200);
        cy.checkAccessibility("body");
      });
    });
  },
);
