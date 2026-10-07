import { CreateDocumentSavePoint } from "./CreateDocumentSavePoint";
import { FetcherWithComponents } from "react-router";
import { ContentRevision } from "../types";
import { useState } from "react";

describe(
  "CreateDocumentSavePoint component tests",
  { tags: ["@group2"] },
  () => {
    const mockContentId = "content-123";

    const mockRevisions: ContentRevision[] = [
      {
        revisionNum: 1,
        revisionName: "First Save Point",
        note: "Initial version",
        source: "source1",
        doenetmlVersion: "0.7",
        cid: "cid-1",
        createdAt: "2025-01-01T10:00:00.000Z",
      },
      {
        revisionNum: 2,
        revisionName: "Second Save Point",
        note: "Updated version",
        source: "source2",
        doenetmlVersion: "0.7",
        cid: "cid-2",
        createdAt: "2025-01-02T10:00:00.000Z",
      },
    ];

    function createMockFetcher(state = "idle", data?: any, alias?: string) {
      const submitStub = cy.stub();
      if (alias) {
        submitStub.as(alias);
      }
      return {
        state,
        formData: undefined,
        data,
        Form: ({ children }: any) => <form>{children}</form>,
        submit: submitStub,
        load: () => {},
      } as unknown as FetcherWithComponents<any>;
    }

    it("shows modal when open", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Create a save point of current activity").should(
        "be.visible",
      );
    });

    it("does not show modal when closed", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={false}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Create a save point of current activity").should(
        "not.exist",
      );
    });

    it("shows create mode when not at last revision", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Create a save point of current activity").should(
        "be.visible",
      );
      cy.contains(
        "Create a save point of the activity to keep a record of its current state.",
      ).should("be.visible");
      cy.get('[data-test="Create revision"]').should(
        "contain.text",
        "Save save point",
      );
    });

    it("shows update mode when at last revision", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={true}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Update info on current save point").should("be.visible");
      cy.contains(
        "A save point of current state of the activity already exists.",
      ).should("be.visible");
      cy.get('[data-test="Create revision"]').should(
        "contain.text",
        "Update save point",
      );
    });

    it("preloads last revision data when at last revision", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={true}
          fetcher={mockFetcher}
        />,
      );

      cy.get('input[type="text"]').should("have.value", "First Save Point");
      cy.get("textarea").should("have.value", "Initial version");
    });

    it("allows user to enter save point name", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('input[type="text"]').type("My Save Point");
      cy.get('input[type="text"]').should("have.value", "My Save Point");
    });

    it("allows user to enter note", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get("textarea").type("This is a note about the save point");
      cy.get("textarea").should(
        "have.value",
        "This is a note about the save point",
      );
    });

    it("disables save button when name is empty", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('[data-test="Create revision"]').should("be.disabled");
    });

    it("shows error message when name is empty", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Save point name is required.").should("be.visible");
    });

    it("enables save button when name is provided", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('input[type="text"]').type("My Save Point");
      cy.get('[data-test="Create revision"]').should("not.be.disabled");
    });

    it("submits fetcher with correct data when saving", () => {
      const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('input[type="text"]').type("My Save Point");
      cy.get("textarea").type("My note");
      cy.get('[data-test="Create revision"]').click();

      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "updateContent/createContentRevision",
        contentId: mockContentId,
        revisionName: "My Save Point",
        note: "My note",
      });
    });

    it("closes modal when save button is clicked", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('input[type="text"]').type("My Save Point");
      cy.get('[data-test="Create revision"]').click();

      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("closes modal when cancel button is clicked", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('[data-test="Cancel Button"]').click();

      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("shows 'Cancel' button in create mode", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('[data-test="Cancel Button"]').should("contain.text", "Cancel");
    });

    it("shows 'Close' button in update mode", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={true}
          fetcher={mockFetcher}
        />,
      );

      cy.get('[data-test="Cancel Button"]').should("contain.text", "Close");
    });

    it("clears fields when switching from update to create mode", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={true}
          fetcher={mockFetcher}
        />,
      );

      // Initially preloaded with last revision data
      cy.get('input[type="text"]').should("have.value", "First Save Point");
      cy.get("textarea").should("have.value", "Initial version");

      // Remount with atLastRevision=false
      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.get('input[type="text"]').should("have.value", "");
      cy.get("textarea").should("have.value", "");
    });

    it("handles empty revisions array", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={[]}
          contentId={mockContentId}
          atLastRevision={false}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Create a save point of current activity").should(
        "be.visible",
      );
      cy.get('input[type="text"]').should("have.value", "");
      cy.get("textarea").should("have.value", "");
    });

    it("allows editing preloaded revision name in update mode", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={true}
          fetcher={mockFetcher}
        />,
      );

      cy.get('input[type="text"]').clear().type("Modified Save Point");
      cy.get('input[type="text"]').should("have.value", "Modified Save Point");
    });

    it("allows editing preloaded note in update mode", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <CreateDocumentSavePoint
          isOpen={true}
          onClose={onCloseSpy}
          revisions={mockRevisions}
          contentId={mockContentId}
          atLastRevision={true}
          fetcher={mockFetcher}
        />,
      );

      cy.get("textarea").clear().type("Modified note");
      cy.get("textarea").should("have.value", "Modified note");
    });

    describe("Accessibility tests", () => {
      it("should be accessible when creating new save point", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");

        cy.mount(
          <CreateDocumentSavePoint
            isOpen={true}
            onClose={onCloseSpy}
            revisions={[]}
            contentId={mockContentId}
            atLastRevision={false}
            fetcher={mockFetcher}
          />,
        );

        cy.get('input[type="text"]').type("Test Save Point");
        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible when updating save point", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");

        cy.mount(
          <CreateDocumentSavePoint
            isOpen={true}
            onClose={onCloseSpy}
            revisions={mockRevisions}
            contentId={mockContentId}
            atLastRevision={true}
            fetcher={mockFetcher}
          />,
        );

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible with validation error", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");

        cy.mount(
          <CreateDocumentSavePoint
            isOpen={true}
            onClose={onCloseSpy}
            revisions={[]}
            contentId={mockContentId}
            atLastRevision={false}
            fetcher={mockFetcher}
          />,
        );

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible with success message", () => {
        // The status Box only renders after fetcher.data changes post-mount (the
        // reset effect clears the message on the initial mount), so drive it via
        // a harness that flips the fetcher data on demand.
        function SuccessHarness() {
          const [data, setData] = useState<any>(undefined);
          const fetcher = {
            state: "idle",
            formData: undefined,
            data,
            Form: ({ children }: any) => <form>{children}</form>,
            submit: cy.stub(),
            load: () => {},
          } as unknown as FetcherWithComponents<any>;
          return (
            <>
              <button
                data-test="trigger"
                onClick={() =>
                  setData({
                    contentRevision: { revisionNum: 1 },
                    createdNew: true,
                  })
                }
              >
                trigger
              </button>
              <CreateDocumentSavePoint
                isOpen={true}
                onClose={cy.spy().as("onClose")}
                revisions={[]}
                contentId={mockContentId}
                atLastRevision={false}
                fetcher={fetcher}
              />
            </>
          );
        }

        cy.mount(<SuccessHarness />);
        // Fill the name field so the (already-tested) validation error is absent
        // and this test isolates the success-box styling.
        cy.get('input[type="text"]').type("My Save Point");
        cy.get('[data-test="trigger"]').click({ force: true });
        cy.get('[data-test="Status message"]').should("be.visible");
        cy.wait(200);
        cy.checkAccessibility("body");
      });
    });
  },
);
