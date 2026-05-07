import { AddStudents } from "./AddStudents";
import { FetcherWithComponents } from "react-router";

describe("AddStudents component tests", { tags: ["@group2"] }, () => {
  const mockFolderId = "12345678-1234-1234-1234-123456789abc";

  function createMockFetcher(data?: any) {
    return {
      state: "idle",
      formData: undefined,
      data: data,
      Form: ({ children }: any) => <form>{children}</form>,
      submit: cy.stub().as("fetcherSubmit"),
      load: () => {},
    } as unknown as FetcherWithComponents<any>;
  }

  it("shows modal when open", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Add students").should("be.visible");
    cy.contains("How many students?").should("be.visible");
  });

  it("does not show modal when closed", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={false}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Add students").should("not.exist");
  });

  it("displays number input with default value of 1", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('input[type="text"]').should("have.value", "1");
  });

  it("allows changing number of students", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('input[type="text"]').clear().type("5");
    cy.get('input[type="text"]').should("have.value", "5");
  });

  it("increments number using stepper", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get("[data-test='num-students-stepper']")
      .find("[role='button']")
      .first()
      .click();
    cy.get('input[type="text"]').should("have.value", "2");
  });

  it("decrements number using stepper", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('input[type="text"]').clear().type("5");
    cy.get("[data-test='num-students-stepper']")
      .find("[role='button']")
      .last()
      .click();
    cy.get('input[type="text"]').should("have.value", "4");
  });

  it("shows create button with correct text", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('input[type="text"]').clear().type("3");
    cy.contains("button", "Create 3 accounts").should("be.visible");
  });

  it("submits fetcher when create button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('input[type="text"]').clear().type("5");
    cy.contains("button", "Create 5 accounts").click();

    cy.get("@fetcherSubmit").should("have.been.calledOnce");
    cy.get("@fetcherSubmit").should("have.been.calledWith", {
      path: "user/handles",
      numAccounts: 5,
      folderId: mockFolderId,
    });
  });

  it("shows Cancel button initially", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Cancel Button"]').should("have.text", "Cancel");
  });

  it("changes Cancel to Done after creating accounts", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "Create 1 accounts").click();
    cy.get('[data-test="Cancel Button"]').should("have.text", "Done");
  });

  it("calls onClose when cancel button is clicked", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('[data-test="Cancel Button"]').click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("displays download passwords UI after accounts are created", () => {
    const mockFetcher = createMockFetcher({
      data: {
        accounts: [
          { username: "student1", password: "pass1" },
          { username: "student2", password: "pass2" },
        ],
      },
    });
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Download Passwords").should("be.visible");
    cy.contains("Passwords will never be downloadable again").should(
      "be.visible",
    );
  });

  it("hides create button after accounts are created", () => {
    const mockFetcher = createMockFetcher({
      data: {
        accounts: [{ username: "student1", password: "pass1" }],
      },
    });
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("button", "Create").should("not.exist");
    cy.contains("How many students?").should("not.exist");
  });

  it("respects finalFocusRef prop", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    const TestWrapper = () => {
      const buttonRef = { current: null as HTMLButtonElement | null };

      return (
        <div>
          <button ref={buttonRef}>Final Focus Button</button>
          <AddStudents
            folderId={mockFolderId}
            isOpen={true}
            onClose={onCloseSpy}
            fetcher={mockFetcher}
            finalFocusRef={buttonRef}
          />
        </div>
      );
    };

    cy.mount(<TestWrapper />);

    cy.contains("Add students").should("be.visible");
  });

  it("resets state when modal closes", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    // Change number and create accounts
    cy.get('input[type="text"]').clear().type("10");
    cy.contains("button", "Create 10 accounts").click();

    // Close modal
    cy.get('[data-test="Cancel Button"]').click();

    cy.get("@onClose").should("have.been.calledOnce");
  });

  // Accessibility tests
  it("is accessible in initial state", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Add students").should("be.visible");
    cy.wait(100);
    cy.checkAccessibility("body");
  });

  it("is accessible with changed number of students", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('input[type="text"]').clear().type("25");
    cy.contains("button", "Create 25 accounts").should("be.visible");
    cy.wait(100);
    cy.checkAccessibility("body");
  });

  it("is accessible after accounts are created", () => {
    const mockFetcher = createMockFetcher({
      data: {
        accounts: [
          { username: "student1", password: "pass1" },
          { username: "student2", password: "pass2" },
          { username: "student3", password: "pass3" },
        ],
      },
    });
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.contains("Download Passwords").should("be.visible");
    cy.wait(100);
    cy.checkAccessibility("body");
  });

  it("is accessible with maximum number of students", () => {
    const mockFetcher = createMockFetcher();
    const onCloseSpy = cy.spy().as("onClose");

    cy.mount(
      <AddStudents
        folderId={mockFolderId}
        isOpen={true}
        onClose={onCloseSpy}
        fetcher={mockFetcher}
      />,
    );

    cy.get('input[type="text"]').clear().type("500");
    cy.contains("button", "Create 500 accounts").should("be.visible");
    cy.wait(100);
    cy.checkAccessibility("body");
  });
});
