import { AddClassificationModal } from "./AddClassificationModal";
import { FetcherWithComponents } from "react-router";
import { ContentClassification } from "../types";

describe(
  "AddClassificationModal component tests",
  { tags: ["@group2"] },
  () => {
    const mockContentId = "12345678-1234-1234-1234-123456789abc";

    const mockClassifications: ContentClassification[] = [
      {
        id: 1,
        code: "K.CC.1",
        descriptions: [
          {
            description: "Count to 100 by ones",
            sortIndex: 0,
            subCategory: {
              id: 1,
              subCategory: "Counting & Cardinality",
              sortIndex: 0,
              category: {
                id: 1,
                category: "Kindergarten",
                system: {
                  id: 1,
                  name: "Common Core Math",
                  shortName: "CCSS-M",
                  type: "Primary",
                  categoryLabel: "Grade",
                  subCategoryLabel: "Domain",
                  descriptionLabel: "Standard",
                  categoriesInDescription: false,
                },
              },
            },
          },
        ],
      },
    ];

    const mockClassificationCategories = [
      {
        id: 1,
        name: "Common Core Math",
        type: "Primary",
        categoryLabel: "Grade",
        subCategoryLabel: "Domain",
        descriptionLabel: "Standard",
        categories: [
          {
            id: 1,
            category: "Kindergarten",
            subCategories: [
              {
                id: 1,
                subCategory: "Counting & Cardinality",
              },
              {
                id: 2,
                subCategory: "Operations & Algebraic Thinking",
              },
            ],
          },
          {
            id: 2,
            category: "Grade 1",
            subCategories: [
              {
                id: 3,
                subCategory: "Operations & Algebraic Thinking",
              },
            ],
          },
        ],
      },
      {
        id: 2,
        name: "Next Generation Science",
        type: "Secondary",
        categoryLabel: "Grade",
        subCategoryLabel: "Topic",
        descriptionLabel: "Performance Expectation",
        categories: [
          {
            id: 3,
            category: "Kindergarten",
            subCategories: [
              {
                id: 4,
                subCategory: "Engineering Design",
              },
            ],
          },
        ],
      },
    ];

    const mockSearchResults: ContentClassification[] = [
      {
        id: 2,
        code: "K.CC.2",
        descriptions: [
          {
            description: "Count forward beginning from a given number",
            sortIndex: 0,
            subCategory: {
              id: 1,
              subCategory: "Counting & Cardinality",
              sortIndex: 0,
              category: {
                id: 1,
                category: "Kindergarten",
                system: {
                  id: 1,
                  name: "Common Core Math",
                  shortName: "CCSS-M",
                  type: "Primary",
                  categoryLabel: "Grade",
                  subCategoryLabel: "Domain",
                  descriptionLabel: "Standard",
                  categoriesInDescription: false,
                },
              },
            },
          },
        ],
      },
      {
        id: 3,
        code: "K.OA.1",
        descriptions: [
          {
            description:
              "Represent addition and subtraction with objects, fingers, mental images, drawings, sounds, acting out situations, verbal explanations, expressions, or equations",
            sortIndex: 0,
            subCategory: {
              id: 2,
              subCategory: "Operations & Algebraic Thinking",
              sortIndex: 0,
              category: {
                id: 1,
                category: "Kindergarten",
                system: {
                  id: 1,
                  name: "Common Core Math",
                  shortName: "CCSS-M",
                  type: "Primary",
                  categoryLabel: "Grade",
                  subCategoryLabel: "Domain",
                  descriptionLabel: "Standard",
                  categoriesInDescription: false,
                },
              },
            },
          },
        ],
      },
    ];

    function createMockFetcher() {
      return {
        state: "idle",
        formData: undefined,
        data: undefined,
        Form: ({ children }: any) => <form>{children}</form>,
        submit: cy.stub().as("fetcherSubmit"),
        load: () => {},
      } as unknown as FetcherWithComponents<any>;
    }

    beforeEach(() => {
      // Intercept the API call for classification categories
      cy.intercept("GET", "/api/classifications/getClassificationCategories", {
        statusCode: 200,
        body: mockClassificationCategories,
      }).as("getCategories");

      // Intercept the search API call
      cy.intercept(
        "GET",
        "/api/classifications/searchPossibleClassifications*",
        {
          statusCode: 200,
          body: mockSearchResults,
        },
      ).as("searchClassifications");
    });

    it("renders modal when open", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={mockClassifications}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Add a classification").should("be.visible");
      cy.get('[data-test="Filter By System"]').should("be.visible");
    });

    it("does not render when closed", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={mockClassifications}
          isOpen={false}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.contains("Add a classification").should("not.exist");
    });

    it("loads classification categories on mount", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={mockClassifications}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");
    });

    it("displays search results", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Matching Classifications"]').should("exist");
      cy.contains("K.CC.2").scrollIntoView().should("be.visible");
      cy.contains("K.OA.1").scrollIntoView().should("be.visible");
    });

    it("allows filtering by system", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");

      cy.get('[data-test="Filter By System"]').select("0");
      cy.wait("@searchClassifications");

      // Category filter should now be enabled
      cy.get('[data-test="Filter By Category"]').should("not.be.disabled");
    });

    it("allows clearing system filter", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");

      // Select a system
      cy.get('[data-test="Filter By System"]').select("0");
      cy.wait("@searchClassifications");

      // Clear the filter
      cy.get('[data-test="Stop Filter By System"]').click();
      cy.wait("@searchClassifications");

      // Category filter should be disabled again
      cy.get('[data-test="Filter By Category"]').should("be.disabled");
    });

    it("allows filtering by category", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");

      // Select a system first
      cy.get('[data-test="Filter By System"]').select("0");
      cy.wait("@searchClassifications");

      // Now select a category
      cy.get('[data-test="Filter By Category"]').select("0");
      cy.wait("@searchClassifications");

      // Subcategory filter should now be enabled
      cy.get('[data-test="Filter By Subcategory"]').should("not.be.disabled");
    });

    it("allows clearing category filter", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");

      // Select system and category
      cy.get('[data-test="Filter By System"]').select("0");
      cy.wait("@searchClassifications");
      cy.get('[data-test="Filter By Category"]').select("0");
      cy.wait("@searchClassifications");

      // Clear the category filter
      cy.get('[data-test="Stop Filter By Category"]').click();
      cy.wait("@searchClassifications");

      // Subcategory filter should be disabled
      cy.get('[data-test="Filter By Subcategory"]').should("be.disabled");
    });

    it("allows filtering by subcategory", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");

      // Select system, category, and subcategory
      cy.get('[data-test="Filter By System"]').select("0");
      cy.wait("@searchClassifications");
      cy.get('[data-test="Filter By Category"]').select("0");
      cy.wait("@searchClassifications");
      cy.get('[data-test="Filter By Subcategory"]').select("0");
      cy.wait("@searchClassifications");
    });

    it("allows clearing subcategory filter", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");

      // Select system, category, and subcategory
      cy.get('[data-test="Filter By System"]').select("0");
      cy.wait("@searchClassifications");
      cy.get('[data-test="Filter By Category"]').select("0");
      cy.wait("@searchClassifications");
      cy.get('[data-test="Filter By Subcategory"]').select("0");
      cy.wait("@searchClassifications");

      // Clear the subcategory filter
      cy.get('[data-test="Stop Filter By Subcategory"]').click();
      cy.wait("@searchClassifications");
    });

    it("allows searching with text input", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      // Type in the search box
      cy.get('[data-test="Search Terms"]').type("count");

      // Wait for debounced search (500ms)
      cy.wait(600);
      cy.wait("@searchClassifications");
    });

    it("triggers immediate search on Enter key", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      // Type and press Enter
      cy.get('[data-test="Search Terms"]').type("count{enter}");

      // Should search immediately without debounce
      cy.wait("@searchClassifications");
    });

    it("shows Add button for new classifications", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Add K.CC.2"]').should("be.visible");
    });

    it("shows Remove button for existing classifications", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={mockSearchResults}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Remove K.CC.2"]').should("be.visible");
    });

    it("submits add classification request", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Add K.CC.2"]').click();

      cy.get("@fetcherSubmit").should("have.been.calledOnce");
      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "classifications/addClassification",
        contentId: mockContentId,
        classificationId: 2,
      });
    });

    it("submits remove classification request", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={mockSearchResults}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Remove K.CC.2"]').click();

      cy.get("@fetcherSubmit").should("have.been.calledOnce");
      cy.get("@fetcherSubmit").should("have.been.calledWith", {
        path: "classifications/removeClassification",
        contentId: mockContentId,
        classificationId: 2,
      });
    });

    it("disables button while waiting for classification change", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      // Click the Add button
      cy.get('[data-test="Add K.CC.2"]').click();

      // Button should be disabled and show spinner
      cy.get('[data-test="Add K.CC.2"]').should("be.disabled");
    });

    it("shows no matching message when results are empty", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      // Override the search intercept to return empty results
      cy.intercept(
        "GET",
        "/api/classifications/searchPossibleClassifications*",
        {
          statusCode: 200,
          body: [],
        },
      ).as("emptySearch");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@emptySearch");

      cy.contains("No matching classifications").should("be.visible");
    });

    it("closes modal when close button is clicked", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.get('[aria-label="Close"]').click();
      cy.get("@onClose").should("have.been.calledOnce");
    });

    // Accessibility tests
    it("is accessible with default state", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Filter By System"]').should("be.visible");
      cy.checkAccessibility("body");
    });

    it("is accessible with filters applied", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      // Apply filters
      cy.get('[data-test="Filter By System"]').select("0");
      cy.wait("@searchClassifications");
      cy.get('[data-test="Filter By Category"]').select("0");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Filter By Category"]').should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible with search results", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@searchClassifications");

      cy.get('[data-test="Matching Classifications"]').should("exist");
      cy.wait(100);
      cy.checkAccessibility("body");
    });

    it("is accessible with no results", () => {
      const mockFetcher = createMockFetcher();
      const onCloseSpy = cy.spy().as("onClose");

      // Override to return empty results
      cy.intercept(
        "GET",
        "/api/classifications/searchPossibleClassifications*",
        {
          statusCode: 200,
          body: [],
        },
      ).as("emptySearch");

      cy.mount(
        <AddClassificationModal
          contentId={mockContentId}
          existingClassifications={[]}
          isOpen={true}
          onClose={onCloseSpy}
          fetcher={mockFetcher}
        />,
      );

      cy.wait("@getCategories");
      cy.wait("@emptySearch");

      cy.contains("No matching classifications").should("be.visible");
      cy.wait(100);
      cy.checkAccessibility("body");
    });
  },
);
