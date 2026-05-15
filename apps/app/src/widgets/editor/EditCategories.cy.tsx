import { EditCategories } from "./EditCategories";
import { CategoryGroup } from "@doenet-tools/shared";

describe("EditCategories Component", { tags: ["@group3"] }, () => {
  const mockAllCategories: CategoryGroup[] = [
    {
      name: "Question Type",
      isRequired: false,
      isExclusive: true,
      categories: [
        {
          code: "isQuestion",
          term: "Question",
          description: "This is a question",
        },
      ],
    },
    {
      name: "Interactivity",
      isRequired: false,
      isExclusive: false,
      categories: [
        {
          code: "isInteractive",
          term: "Interactive",
          description: "This content is interactive",
        },
        {
          code: "containsVideo",
          term: "Video",
          description: "This content contains a video",
        },
      ],
    },
  ];

  const defaultProps = {
    contentId: "test-content-123",
    categories: [
      {
        code: "isQuestion",
        term: "Question",
        description: "This is a question",
      },
    ],
    allCategories: mockAllCategories,
    showRequired: false,
  };

  it("renders correctly and is accessible", () => {
    cy.mount(<EditCategories {...defaultProps} />);

    // Verify the component renders with expected content
    cy.contains("h2", "Question Type").should("be.visible");
    cy.contains("h2", "Interactivity").should("be.visible");

    // Check accessibility
    cy.checkAccessibility("body");
  });

  it("is accessible with required category group", () => {
    const categoriesWithRequired: CategoryGroup[] = [
      {
        name: "Required Question Type",
        isRequired: true,
        isExclusive: true,
        categories: [
          {
            code: "isQuestion",
            term: "Question",
            description: "This is a question",
          },
        ],
      },
    ];

    cy.mount(
      <EditCategories
        contentId={defaultProps.contentId}
        categories={defaultProps.categories}
        allCategories={categoriesWithRequired}
        showRequired={true}
      />,
    );

    cy.contains("Required").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("is accessible with multiple categories selected", () => {
    const multipleCategories = [
      {
        code: "isQuestion",
        term: "Question",
        description: "This is a question",
      },
      {
        code: "isInteractive",
        term: "Interactive",
        description: "This content is interactive",
      },
      {
        code: "containsVideo",
        term: "Video",
        description: "This content contains a video",
      },
    ];

    cy.mount(
      <EditCategories {...defaultProps} categories={multipleCategories} />,
    );

    cy.checkAccessibility("body");
  });

  it("is accessible with no categories selected", () => {
    cy.mount(<EditCategories {...defaultProps} categories={[]} />);

    cy.checkAccessibility("body");
  });

  it("is accessible with exclusive radio group categories", () => {
    cy.mount(
      <EditCategories {...defaultProps} allCategories={mockAllCategories} />,
    );

    // Radio group for exclusive categories
    cy.contains("h2", "Question Type").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("is accessible with non-exclusive checkbox categories", () => {
    cy.mount(
      <EditCategories {...defaultProps} allCategories={mockAllCategories} />,
    );

    // Checkboxes for non-exclusive categories
    cy.contains("h2", "Interactivity").should("be.visible");
    cy.checkAccessibility("body");
  });
});
