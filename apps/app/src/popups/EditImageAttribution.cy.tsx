import { type ComponentProps } from "react";
import {
  EditImageAttribution,
  emptyImageAttribution,
  type ImageAttributionFormValues,
} from "./EditImageAttribution";

// Renders the modal with sensible defaults; per-test overrides via `props`.
function mountModal(
  props: Partial<ComponentProps<typeof EditImageAttribution>> = {},
) {
  // Configure and alias as separate statements: `.resolves()` returns a bare
  // SinonStub without Cypress's `.as()` augmentation, so chaining them wouldn't
  // type-check.
  const onSubmit = cy.stub();
  onSubmit.resolves(undefined);
  onSubmit.as("onSubmit");
  const onClose = cy.spy().as("onClose");
  cy.mount(
    <EditImageAttribution
      isOpen={true}
      onClose={onClose}
      initial={emptyImageAttribution}
      headerLabel="License this image"
      submitLabel="Upload"
      onSubmit={onSubmit}
      {...props}
    />,
  );
}

const SAVE = '[data-test="Save Image Attribution"]';

describe("EditImageAttribution", { tags: ["@group2"] }, () => {
  it("requires a license before saving", () => {
    mountModal();
    cy.get(SAVE).should("be.disabled");
  });

  it("a public-domain license (CC0) enables saving with no author", () => {
    mountModal();
    cy.get('[data-test="License Card CC0"]').click();
    cy.get('[data-test="License Card CC0"]').should(
      "have.attr",
      "aria-pressed",
      "true",
    );
    cy.get(SAVE).should("be.enabled");

    cy.get(SAVE).click();
    cy.get("@onSubmit").should("have.been.calledWithMatch", {
      imageLicenseCodes: "CC0",
      imageAuthorName: "",
    });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("an attribution license (CC-BY) requires an author before saving", () => {
    mountModal();
    cy.get('[data-test="License Card CC-BY"]').click();
    // CC-BY requires crediting the author, so Save stays disabled until filled.
    cy.get(SAVE).should("be.disabled");

    cy.get('[data-test="Image Author Name Input"]').type("Ada Lovelace");
    cy.get(SAVE).should("be.enabled");

    cy.get(SAVE).click();
    cy.get("@onSubmit").should("have.been.calledWithMatch", {
      imageLicenseCodes: "CC-BY",
      imageAuthorName: "Ada Lovelace",
    });
  });

  it("fills the author from 'Use my name'", () => {
    mountModal({ defaultAuthorName: "Grace Hopper" });
    cy.get('[data-test="Image Author Name Input"]').should("have.value", "");
    cy.get('[data-test="Use My Name"]').click();
    cy.get('[data-test="Image Author Name Input"]').should(
      "have.value",
      "Grace Hopper",
    );
  });

  it("blocks saving on a non-web author URL and clears once fixed", () => {
    mountModal();
    cy.get('[data-test="License Card CC-BY"]').click();
    cy.get('[data-test="Image Author Name Input"]').type("Ada Lovelace");
    // A valid license + author would normally enable Save…
    cy.get(SAVE).should("be.enabled");

    // …but a `javascript:` URL (rejected server-side too) blocks it inline.
    cy.get('[data-test="Image Author Url Input"]').type("javascript:alert(1)");
    cy.get(SAVE).should("be.disabled");

    cy.get('[data-test="Image Author Url Input"]')
      .clear()
      .type("https://example.com/ada");
    cy.get(SAVE).should("be.enabled");
  });

  it("reveals the full license list via 'More…' and accepts an uncommon code", () => {
    mountModal();
    // The full dropdown is hidden until "More…" is chosen.
    cy.get('[data-test="Image License Select"]').should("not.exist");
    cy.get('[data-test="License Card Other"]').click();
    cy.get('[data-test="Image License Select"]').select("GFDL");

    cy.get('[data-test="Image Author Name Input"]').type("Wikimedia");
    cy.get(SAVE).click();
    cy.get("@onSubmit").should("have.been.calledWithMatch", {
      imageLicenseCodes: "GFDL",
    });
  });

  it("shows the credit-detail fields inline (no disclosure)", () => {
    mountModal();
    // The fields are rendered inline, not behind an "Add credit details"
    // disclosure — so the toggle is absent and the inputs are present directly.
    // (Not asserting be.visible: fields low in a position:fixed modal read as
    // "not visible" to Cypress purely because of the viewport fold.)
    cy.get('[data-test="Toggle Credit Details"]').should("not.exist");
    cy.get('[data-test="Image Author Url Input"]').should("exist");
    cy.get('[data-test="Image Title Input"]').should("exist");
    cy.get('[data-test="Image Original Url Input"]').should("exist");
  });

  it("submits dual licensing and edited credit details", () => {
    mountModal();
    cy.get('[data-test="License Card CC-BY-SA"]').click();
    cy.get('[data-test="Image Author Name Input"]').type("Jane Doe");
    cy.get('[data-test="Image Title Input"]').type("Doric temple corner");

    // Dual licensing lives under the Advanced disclosure.
    cy.get('[data-test="Toggle Advanced Licensing"]').click();
    cy.get('[data-test="Image License Select 2"]').select("GFDL");

    cy.get(SAVE).click();
    cy.get("@onSubmit").should("have.been.calledWithMatch", {
      imageLicenseCodes: "CC-BY-SA GFDL",
      imageAuthorName: "Jane Doe",
      imageTitle: "Doric temple corner",
    });
  });

  it("seeds the form and shows the preview when editing", () => {
    const initial: ImageAttributionFormValues = {
      imageAuthorName: "Jane Doe",
      imageAuthorUrl: "https://example.com/jane",
      imageTitle: "Doric temple corner",
      imageOriginalUrl: "https://example.com/img",
      imageLicenseCodes: "CC-BY-SA",
      imageLicenseVersion: "4.0",
    };
    mountModal({
      initial,
      imageSource: "doenet:abc123",
      headerLabel: "Image attribution & license",
      submitLabel: "Save",
    });

    cy.get('[data-test="Image Author Name Input"]').should(
      "have.value",
      "Jane Doe",
    );
    cy.get('[data-test="Image Title Input"]').should(
      "have.value",
      "Doric temple corner",
    );
    cy.get('[data-test="License Card CC-BY-SA"]').should(
      "have.attr",
      "aria-pressed",
      "true",
    );
    // A fully-attributed image can be saved as-is.
    cy.get(SAVE).should("be.enabled");

    // Preview is available (edit mode has an image source).
    cy.get('[data-test="Toggle Tag Preview"]').click();
    cy.get('[data-test="Image Tag Preview"]')
      .should("contain.text", 'source="doenet:abc123"')
      .and("contain.text", 'licenseCodes="CC-BY-SA"')
      .and("contain.text", 'authorName="Jane Doe"');
  });
});
