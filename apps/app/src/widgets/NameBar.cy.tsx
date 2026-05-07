import { Icon } from "@chakra-ui/react";
import { FaFile } from "react-icons/fa";
import { type FetcherWithComponents } from "react-router";
import { NameBar } from "./NameBar";

describe("NameBar", { tags: ["@group4"] }, () => {
  function createMockFetcher(): FetcherWithComponents<unknown> {
    return {
      submit: cy.stub().as("fetcherSubmit"),
      load: cy.stub(),
      reset: cy.stub(),
      Form: (() => null) as any,
      state: "idle" as const,
      data: undefined,
      formData: undefined,
      formAction: undefined,
      formMethod: undefined,
      formEncType: undefined,
      text: undefined,
      json: undefined,
    } as FetcherWithComponents<unknown>;
  }

  const defaultIcon = <Icon as={FaFile} aria-label="File Icon" />;

  describe("read-only mode", () => {
    it("renders read-only text when isEditable is false", () => {
      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="My Activity"
          isEditable={false}
          leftIcon={defaultIcon}
          dataTest="Activity Title"
        />,
      );

      cy.get('[data-test="Activity Title"]').should(
        "contain.text",
        "My Activity",
      );
      cy.get('[data-test="Editable Title"]').should("not.exist");
      cy.get('[data-test="Editable Input"]').should("not.exist");

      cy.checkAccessibility("body");
    });

    it("renders read-only text when contentId is null", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId={null}
          contentName="Shared with me"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Folder Title"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Folder Title"]').should(
        "contain.text",
        "Shared with me",
      );
      cy.get('[data-test="Editable Title"]').should("not.exist");

      cy.checkAccessibility("body");
    });

    it("renders with folder font size mode", () => {
      cy.mount(
        <NameBar
          contentId={null}
          contentName="My Activities"
          isEditable={false}
          leftIcon={defaultIcon}
          dataTest="Folder Title"
          fontSizeMode="folder"
        />,
      );

      cy.get('[data-test="Folder Title"]')
        .should("contain.text", "My Activities")
        .and("have.class", "chakra-text");

      cy.checkAccessibility("body");
    });

    it("applies custom max width when provided", () => {
      cy.mount(
        <NameBar
          contentId={null}
          contentName="Trash"
          isEditable={false}
          leftIcon={defaultIcon}
          dataTest="Trash Heading"
          overrideMaxWidth="10rem"
        />,
      );

      cy.get('[data-test="Trash Heading"]')
        .parent()
        .should("have.css", "max-width", "160px"); // 10rem = 160px

      cy.checkAccessibility("body");
    });

    it("renders left icon", () => {
      cy.viewport(1000, 600); // Set viewport to md or larger to show icon

      cy.mount(
        <NameBar
          contentId={null}
          contentName="Test"
          isEditable={false}
          leftIcon={<Icon as={FaFile} aria-label="Test Icon" />}
          dataTest="Test Title"
        />,
      );

      cy.get('[aria-label="Test Icon"]').should("exist");

      cy.checkAccessibility("body");
    });
  });

  describe("editable mode", () => {
    it("renders editable component when isEditable is true and contentId is not null", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="My Activity"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Activity Name"]').should("exist");
      cy.get('[data-test="Editable Title"]').should(
        "contain.text",
        "My Activity",
      );

      cy.checkAccessibility("body");
    });

    it("shows EditableInput when clicked", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="Original Name"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').click();
      cy.get('[data-test="Editable Input"]').should("be.visible");
      cy.get('[data-test="Editable Input"]').should(
        "have.value",
        "Original Name",
      );

      cy.checkAccessibility("body");
    });

    it("updates name when edited and submitted", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="Original Name"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').click();
      cy.get('[data-test="Editable Input"]').clear().type("New Name{enter}");

      cy.get("@fetcherSubmit").should("have.been.calledOnce");
      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "updateContent/updateContentSettings",
        contentId: "test-id",
        name: "New Name",
      });

      cy.checkAccessibility("body");
    });

    it("defaults to 'Untitled' when submitting empty name", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="Original Name"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').click();
      cy.get('[data-test="Editable Input"]').clear().type("{enter}");

      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "updateContent/updateContentSettings",
        contentId: "test-id",
        name: "Untitled",
      });

      cy.checkAccessibility("body");
    });

    it("defaults to 'Untitled' when submitting whitespace-only name", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="Original Name"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').click();
      cy.get('[data-test="Editable Input"]').clear().type("   {enter}");

      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "updateContent/updateContentSettings",
        contentId: "test-id",
        name: "Untitled",
      });

      cy.checkAccessibility("body");
    });

    it("uses folder font size mode in editable mode", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="Folder Name"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Folder Name"
          fontSizeMode="folder"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').should(
        "contain.text",
        "Folder Name",
      );

      cy.checkAccessibility("body");
    });

    it("enforces maxLength of 191 characters", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="Short"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').click();
      cy.get('[data-test="Editable Input"]').should(
        "have.attr",
        "maxlength",
        "191",
      );

      cy.checkAccessibility("body");
    });
  });

  describe("edge cases", () => {
    it("handles special characters in name", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName="Activity & Test <Title> with 'quotes'"
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').should(
        "contain.text",
        "Activity & Test <Title> with 'quotes'",
      );

      cy.checkAccessibility("body");
    });

    it("handles very long names with truncation", () => {
      const longName = "A".repeat(200);

      cy.mount(
        <NameBar
          contentId={null}
          contentName={longName}
          isEditable={false}
          leftIcon={defaultIcon}
          dataTest="Long Title"
        />,
      );

      cy.get('[data-test="Long Title"]').should("exist");

      cy.checkAccessibility("body");
    });

    it("handles empty string as initial name", () => {
      const fetcher = createMockFetcher();

      cy.mount(
        <NameBar
          contentId="test-id"
          contentName=""
          isEditable={true}
          leftIcon={defaultIcon}
          dataTest="Activity Name"
          fetcher={fetcher}
        />,
      );

      cy.get('[data-test="Editable Title"]').should("exist");

      cy.checkAccessibility("body");
    });
  });
});
