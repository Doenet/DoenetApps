import { CopyContentAndReportFinish } from "./CopyContentAndReportFinish";
import { FetcherWithComponents } from "react-router";
import { UserInfo, ContentDescription } from "../types";

describe(
  "CopyContentAndReportFinish component tests",
  { tags: ["@group2"] },
  () => {
    const mockUser: UserInfo = {
      userId: "12345678-1234-1234-1234-123456789999",
      firstNames: "Test",
      lastNames: "User",
    };

    const mockParentFolder: ContentDescription = {
      contentId: "12345678-aaaa-bbbb-cccc-123456789abc",
      name: "Test Folder",
      type: "folder",
      parent: null,
    };

    const mockParentSequence: ContentDescription = {
      contentId: "12345678-bbbb-cccc-dddd-123456789abc",
      name: "Test Problem Set",
      type: "sequence",
      parent: null,
    };

    function createMockFetcher(data?: any) {
      return {
        state: data ? "idle" : "submitting",
        formData: undefined,
        data: data,
        Form: ({ children }: any) => <form>{children}</form>,
        submit: cy.stub().as("fetcherSubmit"),
        load: () => {},
      } as unknown as FetcherWithComponents<any>;
    }

    it("shows loading state when modal opens", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Copy Header"]').should("have.text", "Copying");
      cy.get('[data-test="Copy Body"]').should("contain.text", "Copying...");
      cy.get(".chakra-spinner").should("exist");
      cy.get('[data-test="Go to Destination"]').should("be.disabled");
      cy.get('[data-test="Close Button"]').should("be.disabled");
    });

    it("submits copy request when modal opens", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1", "content2"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get("@fetcherSubmit").should("have.been.calledOnce");
      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "copyMove/copyContent",
        contentIds: ["content1", "content2"],
        parentId: mockParentFolder.contentId,
        prependCopy: false,
      });
    });

    it("shows success state after copy completes to folder", () => {
      const mockFetcher = createMockFetcher({
        status: 200,
        data: { newContentIds: ["new1", "new2"] },
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1", "content2"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Copy Header"]').should("have.text", "Copy finished");
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "2 items copied to:",
      );
      cy.get('[data-test="Copy Body"]').should("contain.text", "Test Folder");
      cy.get('[data-test="Go to Destination"]').should("not.be.disabled");
      cy.get('[data-test="Go to Destination"]').should(
        "have.text",
        "Go to folder",
      );
      cy.get('[data-test="Close Button"]').should("not.be.disabled");
    });

    it("shows success state after add completes to My Activities", () => {
      const mockFetcher = createMockFetcher({
        status: 200,
        data: { newContentIds: ["new1"] },
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={null}
          action="Add"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Copy Header"]').should("have.text", "Add finished");
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "1 item added to:",
      );
      cy.get('[data-test="Copy Body"]').should("contain.text", "My Activities");
      cy.get('[data-test="Go to Destination"]').should(
        "have.text",
        "Go to My Activities",
      );
    });

    it("navigates to folder when Go to Destination is clicked", () => {
      const mockFetcher = createMockFetcher({
        status: 200,
        data: { newContentIds: ["new1"] },
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Go to Destination"]').click();
      cy.get("@onNavigate").should(
        "have.been.calledWith",
        `/activities/${mockUser.userId}/${mockParentFolder.contentId}`,
      );
      cy.get("@setAddTo").should("have.been.calledWith", null);
      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("navigates to problem set editor when Go to Destination is clicked", () => {
      const mockFetcher = createMockFetcher({
        status: 200,
        data: { newContentIds: ["new1"] },
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentSequence}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Go to Destination"]').should(
        "have.text",
        "Open problem set",
      );
      cy.get('[data-test="Go to Destination"]').click();
      cy.get("@onNavigate").should(
        "have.been.calledWith",
        `/compoundEditor/${mockParentSequence.contentId}/edit`,
      );
    });

    it("closes modal when Close button is clicked", () => {
      const mockFetcher = createMockFetcher({
        status: 200,
        data: { newContentIds: ["new1"] },
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Close Button"]').click();
      cy.get("@onClose").should("have.been.calledOnce");
      cy.get("@setAddTo").should("not.have.been.called");
      cy.get("@onNavigate").should("not.have.been.called");
    });

    it("shows error message when copy fails", () => {
      const mockFetcher = createMockFetcher({
        status: 400,
        message: "Invalid content",
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Copy Header"]').should(
        "have.text",
        "An error occurred",
      );
      cy.get('[data-test="Copy Body"]').should(
        "contain.text",
        "An error occurred while copying: Invalid content.",
      );
      cy.get('[data-test="Go to Destination"]').should("not.be.disabled");
      cy.get('[data-test="Close Button"]').should("not.be.disabled");
    });

    it("shows error message without details when copy fails without message", () => {
      const mockFetcher = createMockFetcher({
        status: 500,
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Add"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get('[data-test="Copy Header"]').should(
        "have.text",
        "An error occurred",
      );
      cy.get('[data-test="Copy Body"]').should(
        "have.text",
        "An error occurred while adding.",
      );
    });

    it("includes prependCopy flag when specified", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Copy"
          prependCopy={true}
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "copyMove/copyContent",
        contentIds: ["content1"],
        parentId: mockParentFolder.contentId,
        prependCopy: true,
      });
    });

    it("prevents overlay click during loading", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      );

      // Try clicking overlay - should not close
      cy.get(".chakra-modal__overlay").click({ force: true });
      cy.get("@onClose").should("not.have.been.called");
    });

    it("resets state when modal is closed and reopened", () => {
      const mockFetcher = createMockFetcher({
        status: 200,
        data: { newContentIds: ["new1"] },
      });
      const onCloseSpy = cy.spy().as("onClose");
      const setAddToSpy = cy.spy().as("setAddTo");
      const onNavigateSpy = cy.spy().as("onNavigate");

      cy.mount(
        <CopyContentAndReportFinish
          isOpen={true}
          onClose={onCloseSpy}
          contentIds={["content1"]}
          desiredParent={mockParentFolder}
          action="Copy"
          fetcher={mockFetcher}
          user={mockUser}
          setAddTo={setAddToSpy}
          onNavigate={onNavigateSpy}
        />,
      ).then(({ rerender }) => {
        cy.get('[data-test="Copy Header"]').should(
          "have.text",
          "Copy finished",
        );

        // Close modal
        rerender(
          <CopyContentAndReportFinish
            isOpen={false}
            onClose={onCloseSpy}
            contentIds={["content1"]}
            desiredParent={mockParentFolder}
            action="Copy"
            fetcher={mockFetcher}
            user={mockUser}
            setAddTo={setAddToSpy}
            onNavigate={onNavigateSpy}
          />,
        );

        // Create new fetcher without data
        const newMockFetcher = createMockFetcher();

        // Reopen modal
        rerender(
          <CopyContentAndReportFinish
            isOpen={true}
            onClose={onCloseSpy}
            contentIds={["content2"]}
            desiredParent={mockParentFolder}
            action="Copy"
            fetcher={newMockFetcher}
            user={mockUser}
            setAddTo={setAddToSpy}
            onNavigate={onNavigateSpy}
          />,
        );

        cy.get('[data-test="Copy Header"]').should("have.text", "Copying");
      });
    });

    describe("accessibility tests", () => {
      it("is accessible in loading state", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");
        const setAddToSpy = cy.spy().as("setAddTo");
        const onNavigateSpy = cy.spy().as("onNavigate");

        cy.mount(
          <CopyContentAndReportFinish
            isOpen={true}
            onClose={onCloseSpy}
            contentIds={["content1"]}
            desiredParent={mockParentFolder}
            action="Copy"
            fetcher={mockFetcher}
            user={mockUser}
            setAddTo={setAddToSpy}
            onNavigate={onNavigateSpy}
          />,
        );

        cy.get('[data-test="Copy Header"]').should("have.text", "Copying");
        cy.get('[data-test="Copy Header"]').should("be.visible");
        cy.wait(100);
        cy.checkAccessibility("body");
      });

      it("is accessible in success state", () => {
        const mockFetcher = createMockFetcher({
          status: 200,
          data: { newContentIds: ["new1", "new2"] },
        });
        const onCloseSpy = cy.spy().as("onClose");
        const setAddToSpy = cy.spy().as("setAddTo");
        const onNavigateSpy = cy.spy().as("onNavigate");

        cy.mount(
          <CopyContentAndReportFinish
            isOpen={true}
            onClose={onCloseSpy}
            contentIds={["content1", "content2"]}
            desiredParent={mockParentFolder}
            action="Copy"
            fetcher={mockFetcher}
            user={mockUser}
            setAddTo={setAddToSpy}
            onNavigate={onNavigateSpy}
          />,
        );

        cy.get('[data-test="Copy Header"]').should(
          "have.text",
          "Copy finished",
        );
        cy.get('[data-test="Copy Header"]').should("be.visible");
        cy.wait(100);
        cy.checkAccessibility("body");
      });

      it("is accessible in error state", () => {
        const mockFetcher = createMockFetcher({
          status: 400,
          message: "Invalid content",
        });
        const onCloseSpy = cy.spy().as("onClose");
        const setAddToSpy = cy.spy().as("setAddTo");
        const onNavigateSpy = cy.spy().as("onNavigate");

        cy.mount(
          <CopyContentAndReportFinish
            isOpen={true}
            onClose={onCloseSpy}
            contentIds={["content1"]}
            desiredParent={mockParentFolder}
            action="Copy"
            fetcher={mockFetcher}
            user={mockUser}
            setAddTo={setAddToSpy}
            onNavigate={onNavigateSpy}
          />,
        );

        cy.get('[data-test="Copy Header"]').should(
          "have.text",
          "An error occurred",
        );
        cy.get('[data-test="Copy Header"]').should("be.visible");
        cy.wait(100);
        cy.checkAccessibility("body");
      });
    });
  },
);
