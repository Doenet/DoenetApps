import { MaxAttemptsSelectionBox } from "./EditAssignmentSettings";
import { FetcherWithComponents } from "react-router";
import { useState } from "react";

function createMockFetcher() {
  return {
    state: "idle",
    formData: undefined,
    data: undefined,
    Form: ({ children }: any) => <form>{children}</form>,
    submit: cy.stub(),
    load: () => {},
  } as unknown as FetcherWithComponents<any>;
}

// Wrapper component that manages attempts state
function MaxAttemptsWrapper({ initialAttempts }: { initialAttempts: number }) {
  const [attempts, setAttempts] = useState(initialAttempts);

  // Store setter in window so action can access it
  (window as any).setAttempts = setAttempts;

  // Create a fetcher with submit that actually updates the state
  const fetcher = {
    state: "idle",
    formData: undefined,
    data: undefined,
    Form: ({ children }: any) => <form>{children}</form>,
    submit: (data: any) => {
      if (data.maxAttempts !== undefined) {
        setAttempts(data.maxAttempts);
      }
    },
    load: () => {},
  } as unknown as FetcherWithComponents<any>;

  return (
    <MaxAttemptsSelectionBox
      contentId="test-123"
      attempts={attempts}
      fetcher={fetcher}
    />
  );
}

describe("MaxAttemptsSelectionBox Component", { tags: ["@group3"] }, () => {
  it("should restore the new value when user deletes input and presses enter", () => {
    // Mount the component with initial attempts of 5
    cy.mount(<MaxAttemptsWrapper initialAttempts={5} />);

    // Verify initial value is 5
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "5");

    // Enter a new value (9) and press Enter
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .clear()
      .type("9")
      .type("{enter}");

    // Value should update to 9
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "9");

    // Delete the value with backspace to make it blank
    cy.get('[data-test="max-attempts-input"]').find("input").clear();

    // Should display as blank
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "");

    // Press Enter on the empty input
    cy.get('[data-test="max-attempts-input"]').find("input").type("{enter}");

    // Should restore to the new value (9)
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "9");
  });

  it("should clear to blank when user deletes input, then restore on blur", () => {
    cy.mount(<MaxAttemptsWrapper initialAttempts={3} />);

    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "3");

    // Delete the value
    cy.get('[data-test="max-attempts-input"]').find("input").clear();
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "");

    // Blur the input (click elsewhere)
    cy.get('[data-test="max-attempts-input"]').find("input").blur();

    // Should restore to original value
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "3");
  });

  it("should allow entering and submitting a new valid value", () => {
    cy.mount(<MaxAttemptsWrapper initialAttempts={2} />);

    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "2");

    // Enter new value 7 and press Enter
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .clear()
      .type("7")
      .type("{enter}");

    // Should show the new value
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "7");
  });

  it("should allow unlimited attempts toggle", () => {
    cy.mount(<MaxAttemptsWrapper initialAttempts={5} />);

    // Input should be enabled initially
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("not.be.disabled");

    // Click the unlimited switch
    cy.get("input[type='checkbox']").click({ force: true });

    // Input should now be disabled and show "---"
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("be.disabled");
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "---");

    // Click the unlimited switch again
    cy.get("input[type='checkbox']").click({ force: true });

    // Input should be enabled and show previous value (5)
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("not.be.disabled");
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "5");
  });

  it("value should change when clicking the increment stepper button", () => {
    cy.mount(<MaxAttemptsWrapper initialAttempts={5} />);

    // Verify initial value is 5
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "5");

    // Click the increment button
    cy.get('[data-test="max-attempts-input"]')
      .find("[role='button']")
      .first()
      .click();

    // Value should increment to 6 immediately
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "6");
  });

  it("value should change when clicking the decrement stepper button", () => {
    cy.mount(<MaxAttemptsWrapper initialAttempts={5} />);

    // Verify initial value is 5
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "5");

    // Click the decrement button
    cy.get('[data-test="max-attempts-input"]')
      .find("[role='button']")
      .last()
      .click();

    // Value should decrement to 4 immediately
    cy.get('[data-test="max-attempts-input"]')
      .find("input")
      .should("have.value", "4");
  });

  it("should show the number input as enabled and display the value when attempts is finite", () => {
    cy.mount(
      <MaxAttemptsSelectionBox
        contentId="test-id"
        attempts={5}
        fetcher={createMockFetcher()}
      />,
    );
    cy.get('[data-test="max-attempts-input"] input').should("not.be.disabled");
    cy.get('[data-test="max-attempts-input"] input').should("have.value", "5");
    cy.get('[data-test="unlimited-attempts-switch"]').should(
      "not.have.attr",
      "data-checked",
    );
  });

  it("should show the number input as disabled and display --- when unlimited (attempts = 0)", () => {
    cy.mount(
      <MaxAttemptsSelectionBox
        contentId="test-id"
        attempts={0}
        fetcher={createMockFetcher()}
      />,
    );
    cy.get('[data-test="max-attempts-input"] input').should("be.disabled");
    cy.get('[data-test="max-attempts-input"] input').should(
      "have.value",
      "---",
    );
    cy.get('[data-test="unlimited-attempts-switch"]').should(
      "have.attr",
      "data-checked",
    );
  });
});
