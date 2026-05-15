import { ExploreFilterDrawer } from "./ExploreFilterDrawer";
import { PartialContentClassification, UserInfo } from "../types";
import { CategoryGroup } from "@doenet-tools/shared";

describe("ExploreFilterDrawer", { tags: ["@group1"] }, () => {
  const mockAuthors: UserInfo[] = [
    {
      userId: "author-1" as any,
      firstNames: "Jane",
      lastNames: "Smith",
    },
    {
      userId: "author-2" as any,
      firstNames: "John",
      lastNames: "Doe",
    },
  ];

  const mockAuthorInfo: UserInfo = {
    userId: "author-1" as any,
    firstNames: "Jane",
    lastNames: "Smith",
  };

  const mockCategoryGroups: CategoryGroup[] = [
    {
      name: "Scope",
      isRequired: false,
      isExclusive: false,
      categories: [
        {
          code: "isQuestion",
          description: "Is a question",
          term: "Question",
        },
      ],
    },
    {
      name: "Mode",
      isRequired: false,
      isExclusive: false,
      categories: [
        {
          code: "isInteractive",
          description: "Is interactive",
          term: "Interactive",
        },
      ],
    },
    {
      name: "Setting",
      isRequired: false,
      isExclusive: false,
      categories: [
        {
          code: "setting-1",
          description: "Setting category",
          term: "Setting",
        },
      ],
    },
    {
      name: "Duration",
      isRequired: false,
      isExclusive: false,
      categories: [
        {
          code: "duration-1",
          description: "Duration category",
          term: "Duration",
        },
      ],
    },
    {
      name: "Feature",
      isRequired: false,
      isExclusive: false,
      categories: [
        {
          code: "containsVideo",
          description: "Contains video",
          term: "Contains Video",
        },
      ],
    },
  ];

  const mockClassificationBrowse: PartialContentClassification[] = [
    {
      classification: {
        id: 1,
        code: "MATH",
        descriptionId: 1,
        description: "Mathematics",
      },
      subCategory: {
        id: 1,
        subCategory: "Algebra",
      },
      category: {
        id: 1,
        category: "Mathematics",
      },
      system: {
        id: 1,
        name: "Mathematics System",
        shortName: "Math Sys",
        categoryLabel: "Subject",
        subCategoryLabel: "Topic",
        descriptionLabel: "Concept",
        categoriesInDescription: false,
      },
    },
  ];

  const mockSubCategoryBrowse: PartialContentClassification[] = [
    {
      classification: {
        id: 1,
        code: "ALG",
        descriptionId: 1,
        description: "Algebra",
      },
      subCategory: {
        id: 1,
        subCategory: "Algebra",
      },
      category: {
        id: 1,
        category: "Mathematics",
      },
      system: {
        id: 1,
        name: "Mathematics System",
        shortName: "Math Sys",
        categoryLabel: "Subject",
        subCategoryLabel: "Topic",
        descriptionLabel: "Concept",
        categoriesInDescription: false,
      },
    },
  ];

  const mockCategoryBrowse: PartialContentClassification[] = [];
  const mockSystemBrowse: PartialContentClassification[] = [];

  const mockClassificationInfo: PartialContentClassification = {
    classification: {
      id: 1,
      code: "MATH",
      descriptionId: 1,
      description: "Mathematics",
    },
    subCategory: {
      id: 1,
      subCategory: "Algebra",
    },
    category: {
      id: 1,
      category: "Mathematics",
    },
    system: {
      id: 1,
      name: "Mathematics System",
      shortName: "Math Sys",
      categoryLabel: "Subject",
      subCategoryLabel: "Topic",
      descriptionLabel: "Concept",
      categoriesInDescription: false,
    },
  };

  const mockCountByCategory = {
    isQuestion: { numCurated: 5, numCommunity: 10 },
    isInteractive: { numCurated: 3, numCommunity: 7 },
    "setting-1": { numCurated: 2, numCommunity: 5 },
    "duration-1": { numCurated: 4, numCommunity: 8 },
    containsVideo: { numCurated: 6, numCommunity: 12 },
  };

  const mockCategoriesSet = new Set(["isQuestion", "isInteractive"]);

  beforeEach(() => {
    // Intercept any API calls that FilterPanel might make
    cy.intercept("GET", "/api/**", {
      statusCode: 200,
      body: {},
    });
  });

  it("renders drawer with filter panel when open", () => {
    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={mockAuthors}
        authorInfo={mockAuthorInfo}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={mockClassificationInfo}
        countByCategory={mockCountByCategory}
        categories={mockCategoriesSet}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders close button", () => {
    const onCloseSpy = cy.stub();
    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={onCloseSpy}
        topAuthors={mockAuthors}
        authorInfo={mockAuthorInfo}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={mockClassificationInfo}
        countByCategory={mockCountByCategory}
        categories={mockCategoriesSet}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get("[data-test='Close Filters Button']").should("be.visible");
    cy.get("[data-test='Close Filters Button']").click();
    cy.wrap(onCloseSpy).should("have.been.called");
    cy.checkAccessibility("body");
  });

  it("renders with null authors", () => {
    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={null}
        authorInfo={null}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={mockClassificationInfo}
        countByCategory={mockCountByCategory}
        categories={mockCategoriesSet}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders with null classification info", () => {
    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={mockAuthors}
        authorInfo={mockAuthorInfo}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={null}
        countByCategory={mockCountByCategory}
        categories={mockCategoriesSet}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders with empty browse arrays", () => {
    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={mockAuthors}
        authorInfo={mockAuthorInfo}
        classificationBrowse={[]}
        subCategoryBrowse={[]}
        categoryBrowse={[]}
        systemBrowse={[]}
        classificationInfo={null}
        countByCategory={mockCountByCategory}
        categories={new Set()}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders with search query", () => {
    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={mockAuthors}
        authorInfo={mockAuthorInfo}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={mockClassificationInfo}
        countByCategory={mockCountByCategory}
        categories={mockCategoriesSet}
        allCategories={mockCategoryGroups}
        search="algebra"
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders with multiple authors", () => {
    const manyAuthors: UserInfo[] = Array.from({ length: 10 }, (_, i) => ({
      userId: `author-${i}` as any,
      firstNames: `Author${i}`,
      lastNames: `Test${i}`,
    }));

    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={manyAuthors}
        authorInfo={manyAuthors[0]}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={mockClassificationInfo}
        countByCategory={mockCountByCategory}
        categories={mockCategoriesSet}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders with multiple categories", () => {
    const manyCategories = new Set([
      "Mathematics",
      "Science",
      "Language Arts",
      "Social Studies",
      "Technology",
    ]);

    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={mockAuthors}
        authorInfo={mockAuthorInfo}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={mockClassificationInfo}
        countByCategory={mockCountByCategory}
        categories={manyCategories}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders with category counts", () => {
    const countByCategory = {
      isQuestion: { numCurated: 15, numCommunity: 42 },
      isInteractive: { numCurated: 8, numCommunity: 23 },
      "setting-1": { numCurated: 12, numCommunity: 35 },
      "duration-1": { numCurated: 5, numCommunity: 18 },
      containsVideo: { numCurated: 10, numCommunity: 28 },
    };

    cy.mount(
      <ExploreFilterDrawer
        isOpen={true}
        onClose={cy.stub()}
        topAuthors={mockAuthors}
        authorInfo={mockAuthorInfo}
        classificationBrowse={mockClassificationBrowse}
        subCategoryBrowse={mockSubCategoryBrowse}
        categoryBrowse={mockCategoryBrowse}
        systemBrowse={mockSystemBrowse}
        classificationInfo={mockClassificationInfo}
        countByCategory={countByCategory}
        categories={mockCategoriesSet}
        allCategories={mockCategoryGroups}
        search=""
        navigate={cy.stub()}
      />,
    );

    cy.get('[role="dialog"]').should("be.visible");
    cy.checkAccessibility("body");
  });
});
