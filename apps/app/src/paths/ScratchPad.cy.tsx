import { ScratchPadComponent, type DocumentEditorProps } from "./ScratchPad";
import { DoenetmlVersion, UserInfoWithEmail } from "../types";
import defaultSource from "../assets/scratchPadDefault.doenet?raw";

const initialSource = "<document><p>Initial scratch pad source</p></document>";
const changedSource = "<document><p>Edited source</p></document>";

const selectors = {
  loadButton: '[data-test="Load Button"]',
  addDefaultButton: '[data-test="Add Default Button"]',
  saveToDocumentButton: '[data-test="Save to Document"]',
  mockEditorChangeButton: '[data-test="Mock Editor Change"]',
  copyHeader: '[data-test="Copy Header"]',
};

const mockVersion: DoenetmlVersion = {
  id: 2,
  displayedVersion: "0.7",
  fullVersion: "0.7.0",
  default: true,
  deprecated: false,
  removed: false,
  deprecationMessage: "",
};

const mockUser: UserInfoWithEmail = {
  userId: "user123",
  email: "test@example.com",
  firstNames: "Test",
  lastNames: "User",
};

const MockEditor = ({ sourceChangedCallback }: DocumentEditorProps) => {
  return (
    <div data-test="Mock Editor">
      <button
        data-test="Mock Editor Change"
        onClick={() => sourceChangedCallback?.(changedSource)}
      >
        Trigger editor change
      </button>
    </div>
  );
};

function mountScratchPad(
  overrides?: Partial<{
    user?: UserInfoWithEmail;
    setAddTo: (value: any) => void;
    navigate: (path: string) => void;
    discussHref: string;
    editorComponent: typeof MockEditor;
  }>,
  captureRequest = false,
  actionOverride?: (data: { request: Request }) => Promise<any>,
) {
  let latestRequest:
    | {
        method: string;
        contentType: string;
        body: Record<string, any>;
      }
    | undefined;

  cy.mount(
    <ScratchPadComponent
      doenetmlVersion={mockVersion}
      initialSource={initialSource}
      user={mockUser}
      setAddTo={cy.spy().as("setAddTo")}
      navigate={cy.spy().as("navigate")}
      discussHref="https://example.com/discuss"
      editorComponent={MockEditor}
      {...overrides}
    />,
    {
      action:
        actionOverride ??
        (async ({ request }) => {
          if (captureRequest) {
            latestRequest = {
              method: request.method,
              contentType: request.headers.get("content-type") || "",
              body: (await request.json()) as Record<string, any>,
            };
          }

          return {
            status: 200,
            data: {
              contentId: "content123",
            },
          };
        }),
    },
  );

  return {
    getLatestRequest: () => latestRequest,
  };
}

function loadWelcomeTemplate() {
  cy.get(selectors.loadButton).click();
  cy.get(selectors.addDefaultButton).click();
}

function saveToDocument() {
  cy.get(selectors.saveToDocumentButton).click();
}

function triggerEditorChange() {
  cy.get(selectors.mockEditorChangeButton).click({ force: true });
}

function expectLatestRequest(
  getLatestRequest: () =>
    | {
        method: string;
        contentType: string;
        body: Record<string, any>;
      }
    | undefined,
  expectedBody: Record<string, any>,
) {
  cy.wrap(null).should(() => {
    const request = getLatestRequest();
    expect(request).to.not.equal(undefined);
    expect(request?.method).to.equal("POST");
    expect(request?.contentType).to.contain("application/json");
    expect(request?.body.path).to.equal("updateContent/createContent");
    expect(request?.body.contentType).to.equal("singleDoc");

    Object.entries(expectedBody).forEach(([key, value]) => {
      expect(request?.body[key]).to.equal(value);
    });
  });
}

describe("ScratchPad tests", { tags: ["@group2"] }, () => {
  describe("ScratchPad save payload", () => {
    it("does not show save button when user is not logged in", () => {
      mountScratchPad({ user: undefined });

      cy.get(selectors.loadButton).should("exist");
      cy.get(selectors.saveToDocumentButton).should("not.exist");
    });

    it("sends Welcome source when save occurs immediately after setInitialSource", () => {
      const { getLatestRequest } = mountScratchPad(undefined, true);

      loadWelcomeTemplate();
      saveToDocument();

      expectLatestRequest(getLatestRequest, {
        doenetml: defaultSource,
        name: "Scratch Pad Document",
      });
      cy.wrap(null).should(() => {
        expect(getLatestRequest()?.body.doenetml).to.not.equal(initialSource);
      });
    });

    it("sends latest editor source after an editor callback", () => {
      const { getLatestRequest } = mountScratchPad(undefined, true);

      triggerEditorChange();
      saveToDocument();

      expectLatestRequest(getLatestRequest, { doenetml: changedSource });
      cy.wrap(null).should(() => {
        expect(getLatestRequest()?.body.doenetml).to.not.equal(initialSource);
      });
    });

    it("sends initial source when no load or editor callback occurs", () => {
      const { getLatestRequest } = mountScratchPad(undefined, true);

      saveToDocument();

      expectLatestRequest(getLatestRequest, { doenetml: initialSource });
    });

    it("uses Welcome loaded source when load occurs after an editor change", () => {
      const { getLatestRequest } = mountScratchPad(undefined, true);

      triggerEditorChange();
      loadWelcomeTemplate();
      saveToDocument();

      expectLatestRequest(getLatestRequest, { doenetml: defaultSource });
      cy.wrap(null).should(() => {
        expect(getLatestRequest()?.body.doenetml).to.not.equal(changedSource);
      });
    });
  });

  describe("ScratchPad accessibility", () => {
    it("is accessible on initial render", () => {
      mountScratchPad();

      cy.contains("Scratch Pad").should("be.visible");
      cy.checkAccessibility("body");
    });

    it("is accessible with load menu open", () => {
      mountScratchPad();

      cy.get(selectors.loadButton).click();
      cy.contains("Multiple Choice Examples").should("be.visible");
      cy.checkAccessibility("body");
    });

    it("is accessible while save modal is open", () => {
      mountScratchPad(undefined, false, () => new Promise(() => undefined));

      saveToDocument();
      cy.get(selectors.copyHeader).should("contain.text", "Saving...");
      cy.checkAccessibility("body");
    });
  });

  describe("ScratchPad menu behavior", () => {
    it("does not leave help tooltip open after closing menu by outside click", () => {
      mountScratchPad();

      cy.get('[aria-label="Help"]').click();
      cy.get('[data-test="ScratchPad Help Menu List"]:visible')
        .contains("Documentation")
        .should("exist");

      cy.get(selectors.loadButton).click();

      cy.get('[aria-label="Help"]').should(
        "have.attr",
        "aria-expanded",
        "false",
      );
      cy.get('[data-test="ScratchPad Help Menu List"]:visible').should(
        "not.exist",
      );
      cy.get('[role="tooltip"]:visible').should("not.exist");
    });

    it("closes Help menu when interacting with outside control", () => {
      mountScratchPad();

      cy.get('[aria-label="Help"]').click();
      cy.get('[data-test="ScratchPad Help Menu List"]:visible')
        .contains("Documentation")
        .should("exist");

      cy.get(selectors.loadButton).click();

      cy.get('[aria-label="Help"]').should(
        "have.attr",
        "aria-expanded",
        "false",
      );
      cy.get('[data-test="ScratchPad Help Menu List"]:visible').should(
        "not.exist",
      );
      cy.get('[role="tooltip"]:visible').should("not.exist");
      cy.get('[data-test="ScratchPad Load Menu List"]:visible')
        .contains("Multiple Choice Examples")
        .should("exist");
    });
  });
});
