import { SavePointInfo } from "./SavePointInfo";
import { FetcherWithComponents } from "react-router";
import { ContentRevision } from "../types";
import { DateTime } from "luxon";

function createMockFetcher(state: "idle" | "loading") {
  return {
    state,
    submit: cy.stub().as("fetcherSubmit"),
    load: cy.stub(),
    reset: cy.stub(),
    Form: (() => null) as any,
  } as unknown as FetcherWithComponents<any>;
}

function getDefaultProps() {
  const revision: ContentRevision = {
    revisionNum: 1,
    revisionName: "Initial Save Point",
    note: "First version.",
    source: "user",
    doenetmlVersion: "1.0.0",
    cid: "cid123",
    createdAt: DateTime.now().toISO(),
  };
  return {
    isOpen: true,
    onClose: cy.spy().as("onClose"),
    revision,
    finalFocusRef: undefined,
    fetcher: createMockFetcher("idle"),
    contentId: "content123",
  };
}

describe("SavePointInfo component", { tags: ["@group3"] }, () => {
  it("shows modal when open", () => {
    const props = getDefaultProps();
    cy.mount(<SavePointInfo {...props} />);
    cy.contains("Details on save point").should("be.visible");
  });

  it("does not show modal when closed", () => {
    const props = getDefaultProps();
    props.isOpen = false;
    cy.mount(<SavePointInfo {...props} />);
    cy.contains("Details on save point").should("not.exist");
  });

  it("displays revision info", () => {
    const props = getDefaultProps();
    cy.mount(<SavePointInfo {...props} />);
    cy.get("input[type='text']").should(
      "have.value",
      props.revision.revisionName,
    );
    cy.get("textarea").should("have.value", props.revision.note);
    cy.contains("Created:").should("exist");
  });

  it("disables update button if no changes", () => {
    const props = getDefaultProps();
    cy.mount(<SavePointInfo {...props} />);
    cy.get('[data-test="Update Button"]').should("be.disabled");
  });

  it("enables update button when fields change", () => {
    const props = getDefaultProps();
    cy.mount(<SavePointInfo {...props} />);
    cy.get("input[type='text']").clear().type("New Name");
    cy.get('[data-test="Update Button"]').should("not.be.disabled");
  });

  it("shows error if save point name is empty", () => {
    const props = getDefaultProps();
    cy.mount(<SavePointInfo {...props} />);
    cy.get("input[type='text']").clear();
    cy.get('[data-test="Update Button"]').should("be.disabled");
    cy.contains("Save point name is required.").should("exist");
  });

  it("calls fetcher.submit and onClose on update", () => {
    const props = getDefaultProps();
    cy.mount(<SavePointInfo {...props} />);
    cy.get("input[type='text']").clear().type("Updated Name");
    cy.get("textarea").clear().type("Updated note");
    cy.get('[data-test="Update Button"]').click();
    cy.get("@fetcherSubmit").should("have.been.calledOnce");
    cy.get("@fetcherSubmit").should(
      "have.been.calledWith",
      {
        path: "updateContent/updateContentRevision",
        contentId: props.contentId,
        revisionName: "Updated Name",
        note: "Updated note",
        revisionNum: props.revision.revisionNum,
      },
      { method: "post", encType: "application/json" },
    );
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("calls onClose when close button is clicked", () => {
    const props = getDefaultProps();
    cy.mount(<SavePointInfo {...props} />);
    cy.get('[data-test="Close Button"]').click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  describe("Accessibility", () => {
    it("should be accessible when open", () => {
      const props = getDefaultProps();
      cy.mount(<SavePointInfo {...props} />);
      cy.wait(200);
      cy.checkAccessibility("body");
    });
    it("should be accessible with error", () => {
      const props = getDefaultProps();
      cy.mount(<SavePointInfo {...props} />);
      cy.get("input[type='text']").clear();
      cy.wait(200);
      cy.checkAccessibility("body");
    });
  });
});
