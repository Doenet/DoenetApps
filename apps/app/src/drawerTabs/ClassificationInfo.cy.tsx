import { ClassificationInfo } from "./ClassificationInfo";
import { Content } from "../types";

describe("ClassificationInfo", { tags: ["@group1"] }, () => {
  const mockClassifications = [
    {
      id: 1,
      code: "MATH",
      descriptions: [
        {
          description: "Mathematics",
          sortIndex: 1,
          subCategory: {
            id: 1,
            subCategory: "Algebra",
            sortIndex: 1,
            category: {
              id: 1,
              category: "Mathematics",
              system: {
                id: 1,
                name: "Subject",
                shortName: "Subj",
                categoryLabel: "Subject",
                subCategoryLabel: "Topic",
                descriptionLabel: "Concept",
                categoriesInDescription: false,
                type: "content",
              },
            },
          },
        },
      ],
    },
  ];

  const mockActivityWithClassifications: Content = {
    contentId: "activity-1" as any,
    ownerId: "owner-1" as any,
    name: "Test Activity",
    isPublic: true,
    visibility: "public",
    isShared: false,
    sharedWith: [],
    licenseCode: "CCDUAL",
    categories: [],
    classifications: mockClassifications,
    parent: null,
    owner: {
      userId: "owner-1" as any,
      firstNames: "Test",
      lastNames: "Owner",
    },
    type: "singleDoc",
    numVariants: 1,
    doenetML: "<doenetML></doenetML>",
    doenetmlVersion: {
      id: 1,
      displayedVersion: "0.7.0",
      fullVersion: "0.7.0",
      default: true,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    },
  };

  const mockActivityNoClassifications: Content = {
    ...mockActivityWithClassifications,
    classifications: [],
  };

  it("renders classifications for activity", () => {
    cy.mount(
      <ClassificationInfo contentData={mockActivityWithClassifications} />,
    );

    cy.contains("Classifications").should("be.visible");
    cy.contains("MATH").should("be.visible");
    cy.contains("Subject").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("renders no classifications message when empty", () => {
    cy.mount(
      <ClassificationInfo contentData={mockActivityNoClassifications} />,
    );

    cy.contains("Classifications").should("be.visible");
    cy.contains("None added yet").should("be.visible");
    cy.checkAccessibility("body");
  });

  it("expands classification accordion on click", () => {
    cy.mount(
      <ClassificationInfo contentData={mockActivityWithClassifications} />,
    );

    cy.contains("Algebra").should("be.visible");
    cy.contains("MATH").parent().click();
    cy.contains("Algebra").should("not.be.visible");
    cy.contains("MATH").parent().click();
    cy.contains("Algebra").should("be.visible");
    cy.wait(100);
    cy.checkAccessibility("body");
  });

  it("displays multiple classifications", () => {
    const multipleClassifications = [
      ...mockClassifications,
      {
        id: 2,
        code: "SCI",
        descriptions: [
          {
            description: "Science",
            sortIndex: 1,
            subCategory: {
              id: 2,
              subCategory: "Physics",
              sortIndex: 1,
              category: {
                id: 2,
                category: "Science",
                system: {
                  id: 2,
                  name: "Domain",
                  shortName: "Dom",
                  categoryLabel: "Domain",
                  subCategoryLabel: "Field",
                  descriptionLabel: "Area",
                  categoriesInDescription: false,
                  type: "content",
                },
              },
            },
          },
        ],
      },
    ];

    const activityWithMultiple = {
      ...mockActivityWithClassifications,
      classifications: multipleClassifications,
    };

    cy.mount(<ClassificationInfo contentData={activityWithMultiple} />);

    cy.contains("MATH").should("be.visible");
    cy.contains("SCI").should("be.visible");
    cy.contains("Subject").should("be.visible");
    cy.contains("Domain").should("be.visible");
    cy.checkAccessibility("body");
  });
});
