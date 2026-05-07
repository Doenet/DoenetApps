import { DocumentComparisonControls } from "./DocumentComparisonControls";
import { FetcherWithComponents } from "react-router";
import { DoenetmlVersion, UserInfo } from "../types";

describe(
  "DocumentComparisonControls component tests",
  { tags: ["@group2"] },
  () => {
    const mockUser: UserInfo = {
      userId: "user-123",
      firstNames: "Jane",
      lastNames: "Doe",
    };

    const mockDoenetmlVersion: DoenetmlVersion = {
      id: 1,
      displayedVersion: "0.7",
      fullVersion: "0.7.0",
      default: true,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    };

    const mockActivity = {
      doenetML: "<document>Test</document>",
      doenetmlVersion: mockDoenetmlVersion,
      name: "My Activity",
      contentId: "content-123",
    };

    const mockActivityCompare = {
      doenetML: "<document>Updated</document>",
      doenetmlVersion: mockDoenetmlVersion,
      name: "Source Activity",
      contentId: "content-456",
      owner: mockUser,
    };

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
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Update your activity to remix source?").should("be.visible");
    });

    it("does not show modal when closed", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={false}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Update your activity to remix source?").should("not.exist");
    });

    it("shows correct title when activityAtCompare is true", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={false}
          activityAtCompare={true}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Mark changes as ignored?").should("be.visible");
    });

    it("shows correct title when changes not detected", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={false}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Update even though no changes detected?").should(
        "be.visible",
      );
    });

    it("displays activity and compare names", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("My Activity").should("be.visible");
      cy.contains("Source Activity").should("be.visible");
    });

    it("displays compare owner name", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Jane Doe").should("be.visible");
    });

    it("shows radio options when activityCompareChanged is true", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Yes, update my activity to match").should("be.visible");
      cy.contains("No, ignore changes").should("be.visible");
      cy.contains("Let me manually copy changes").should("be.visible");
    });

    it("allows selecting update option", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Yes, update my activity to match").click();
      cy.contains("Update activity").should("be.visible");
    });

    it("allows selecting ignore option", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("No, ignore changes").click();
      cy.contains("Ignore changes").should("be.visible");
    });

    it("allows selecting manual copy option", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Let me manually copy changes").click();
      cy.contains("Open manual comparison").should("be.visible");
    });

    it("submits with update action when update option selected", () => {
      const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Yes, update my activity to match").click();
      cy.contains("Update activity").click();

      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        _action: "update to",
        contentId: "content-123",
        compareId: "content-456",
        ignore: false,
        compareRelation: "source",
      });
    });

    it("submits with ignore action when ignore option selected", () => {
      const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("No, ignore changes").click();
      cy.contains("Ignore changes").click();

      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        _action: "update to",
        contentId: "content-123",
        compareId: "content-456",
        ignore: true,
        compareRelation: "source",
      });
    });

    it("submits with remix compareRelation", () => {
      const mockFetcher = createMockFetcher("idle", undefined, "fetcherSubmit");
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="remix"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Yes, update my activity to match").click();
      cy.contains("Update activity").click();

      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        _action: "update to",
        contentId: "content-123",
        compareId: "content-456",
        ignore: false,
        compareRelation: "remix",
      });
    });

    it("closes modal when cancel button clicked", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.get('[data-test="Cancel Button"]').click();

      cy.get("@onClose").should("have.been.calledOnce");
    });

    it("sets ignore as default option when activityAtCompare", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={false}
          activityAtCompare={true}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Ignore changes").should("be.visible");
    });

    it("does not show options when activityAtCompare is true and not changed", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={false}
          activityAtCompare={true}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Yes, update my activity to match").should("not.exist");
      cy.contains("No, ignore changes").should("not.exist");
    });

    it("handles remix compareRelation text correctly", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={true}
          activityAtCompare={false}
          compareRelation="remix"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Update your activity to remixed activity?").should(
        "be.visible",
      );
    });

    it("shows manual comparison option in no changes scenario", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={false}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Manually copy changes").should("be.visible");
    });

    it("displays both radio options in no changes scenario", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <DocumentComparisonControls
          isOpen={true}
          onClose={onCloseSpy}
          activity={mockActivity}
          activityCompare={mockActivityCompare}
          activityCompareChanged={false}
          activityAtCompare={false}
          compareRelation="source"
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Update my activity to match this remix source").should(
        "be.visible",
      );
      cy.contains("Manually copy changes").should("be.visible");
    });

    describe("Accessibility tests", () => {
      it("should be accessible when activity is at compare", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");

        cy.mount(
          <DocumentComparisonControls
            isOpen={true}
            onClose={onCloseSpy}
            activity={mockActivity}
            activityCompare={mockActivityCompare}
            activityCompareChanged={false}
            activityAtCompare={true}
            compareRelation="source"
            fetcher={mockFetcher}
          />,
        );

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible when activity has changed", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");

        cy.mount(
          <DocumentComparisonControls
            isOpen={true}
            onClose={onCloseSpy}
            activity={mockActivity}
            activityCompare={mockActivityCompare}
            activityCompareChanged={true}
            activityAtCompare={false}
            compareRelation="source"
            fetcher={mockFetcher}
          />,
        );

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible when no changes detected", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");

        cy.mount(
          <DocumentComparisonControls
            isOpen={true}
            onClose={onCloseSpy}
            activity={mockActivity}
            activityCompare={mockActivityCompare}
            activityCompareChanged={false}
            activityAtCompare={false}
            compareRelation="source"
            fetcher={mockFetcher}
          />,
        );

        cy.wait(200);
        cy.checkAccessibility("body");
      });

      it("should be accessible with remix compareRelation", () => {
        const mockFetcher = createMockFetcher();
        const onCloseSpy = cy.spy().as("onClose");

        cy.mount(
          <DocumentComparisonControls
            isOpen={true}
            onClose={onCloseSpy}
            activity={mockActivity}
            activityCompare={mockActivityCompare}
            activityCompareChanged={true}
            activityAtCompare={false}
            compareRelation="remix"
            fetcher={mockFetcher}
          />,
        );

        cy.wait(200);
        cy.checkAccessibility("body");
      });
    });
  },
);
