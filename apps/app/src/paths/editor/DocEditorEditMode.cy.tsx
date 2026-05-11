import {
  forwardRef,
  useImperativeHandle,
  type ComponentProps,
  type ForwardedRef,
} from "react";
import {
  DoenetEditor,
  type DiagnosticsTabId,
  type DoenetEditorHandle,
} from "@doenet/doenetml-iframe";
import { useSearchParams } from "react-router";
import { DoenetmlVersion } from "../../types";
import { DocEditorEditModeComponent } from "./DocEditorEditMode";

const mockVersion: DoenetmlVersion = {
  id: 2,
  displayedVersion: "0.7",
  fullVersion: "0.7.0",
  default: true,
  deprecated: false,
  removed: false,
  deprecationMessage: "",
};

type MockEditorProps = ComponentProps<typeof DoenetEditor>;

describe("DocEditorEditModeComponent", { tags: ["@group1"] }, () => {
  it("passes the initial diagnostics tab on first mount", () => {
    const openDiagnosticsSpy = cy.spy().as("openDiagnosticsSpy");

    const MockEditor = forwardRef(function MockEditor(
      props: MockEditorProps,
      ref: ForwardedRef<DoenetEditorHandle>,
    ) {
      useImperativeHandle(
        ref,
        () => ({
          openDiagnosticsTab(tab: DiagnosticsTabId) {
            openDiagnosticsSpy(tab);
          },
          closeDiagnosticsPanel() {},
        }),
        [],
      );

      return (
        <>
          <div data-testid="mock-editor">Mock editor</div>
          <div data-testid="initial-open-tab">{props.initialOpenTab ?? ""}</div>
        </>
      );
    });

    function TestHarness() {
      const [searchParams] = useSearchParams();

      return (
        <>
          <div data-testid="current-search">{searchParams.toString()}</div>
          <DocEditorEditModeComponent
            contentId="test-content-123"
            source="<document><text>Hello</text></document>"
            readOnly={false}
            doenetmlVersion={mockVersion}
            editorComponent={MockEditor}
          />
        </>
      );
    }

    cy.mount(<TestHarness />, {
      routerProps: { initialEntries: ["/?diagnostics=errors"] },
    });

    cy.get("@openDiagnosticsSpy").should("not.have.been.called");
    cy.get("[data-testid='initial-open-tab']").should("have.text", "errors");
    cy.get("[data-testid='current-search']").should("have.text", "");
    cy.get("[data-testid='mock-editor']").should("be.visible");
  });

  it("reopens diagnostics when the same page requests a panel change", () => {
    const openDiagnosticsSpy = cy.spy().as("openDiagnosticsSpy");

    const MockEditor = forwardRef(function MockEditor(
      _props: MockEditorProps,
      ref: ForwardedRef<DoenetEditorHandle>,
    ) {
      useImperativeHandle(
        ref,
        () => ({
          openDiagnosticsTab(tab: DiagnosticsTabId) {
            openDiagnosticsSpy(tab);
          },
          closeDiagnosticsPanel() {},
        }),
        [],
      );

      return <div data-testid="mock-editor">Mock editor</div>;
    });

    function TestHarness() {
      const [searchParams, setSearchParams] = useSearchParams();

      return (
        <>
          <button
            type="button"
            onClick={() => setSearchParams({ diagnostics: "accessibility" })}
          >
            Open accessibility
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ diagnostics: "errors" })}
          >
            Open errors
          </button>
          <div data-testid="current-search">{searchParams.toString()}</div>
          <DocEditorEditModeComponent
            contentId="test-content-123"
            source="<document><text>Hello</text></document>"
            readOnly={false}
            doenetmlVersion={mockVersion}
            editorComponent={MockEditor}
          />
        </>
      );
    }

    cy.mount(<TestHarness />);

    cy.get("@openDiagnosticsSpy").should("not.have.been.called");
    cy.contains("Open accessibility").click();
    cy.get("@openDiagnosticsSpy").should("have.been.calledOnce");
    cy.get("@openDiagnosticsSpy").then((spy) => {
      expect(spy).to.have.been.calledWith("accessibility");
    });
    cy.get("[data-testid='current-search']").should("have.text", "");
    cy.contains("Open errors").click();
    cy.get("@openDiagnosticsSpy").should("have.callCount", 2);
    cy.get("@openDiagnosticsSpy").then((spy) => {
      expect(spy).to.have.been.calledWith("errors");
    });
  });
});
