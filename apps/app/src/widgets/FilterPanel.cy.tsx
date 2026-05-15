import { FilterPanel } from "./FilterPanel";
import { UserInfo } from "../types";
import { CategoryGroup } from "@doenet-tools/shared";

type FilterPanelProps = React.ComponentProps<typeof FilterPanel>;

const allCategories: CategoryGroup[] = [
  {
    name: "Scope",
    isRequired: false,
    isExclusive: false,
    categories: [
      {
        code: "isQuestion",
        term: "Question",
        description: "Question content",
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
        term: "Interactive",
        description: "Interactive content",
      },
    ],
  },
  {
    name: "Setting",
    isRequired: false,
    isExclusive: false,
    categories: [
      {
        code: "containsVideo",
        term: "Video",
        description: "Contains video",
      },
    ],
  },
  { name: "Duration", isRequired: false, isExclusive: false, categories: [] },
  { name: "Feature", isRequired: false, isExclusive: false, categories: [] },
];

function createDefaultProps(
  overrides?: Partial<FilterPanelProps>,
): FilterPanelProps {
  return {
    topAuthors: null,
    authorInfo: null,
    classificationBrowse: null,
    subCategoryBrowse: null,
    categoryBrowse: null,
    systemBrowse: null,
    classificationInfo: null,
    countByCategory: {
      isQuestion: { numCurated: 2, numCommunity: 1 },
      isInteractive: { numCurated: 0, numCommunity: 0 },
      containsVideo: { numCurated: 0, numCommunity: 0 },
    },
    categories: new Set<string>(),
    allCategories,
    search: "",
    navigate: cy.stub().as("navigate"),
    ...overrides,
  };
}

describe("FilterPanel Component", { tags: ["@group4"] }, () => {
  it("renders filters and is accessible", () => {
    const props = createDefaultProps();

    cy.mount(<FilterPanel {...props} />);

    cy.contains("Filters").should("be.visible");
    cy.get('[data-test="isQuestion Checkbox"] input').should("be.enabled");
    cy.get('[data-test="isInteractive Checkbox"] input').should("be.disabled");

    cy.checkAccessibility("body");
  });

  it("displays clear filter buttons when filters are active", () => {
    const authorInfo: UserInfo = {
      userId: "author-123",
      firstNames: "Ada",
      lastNames: "Lovelace",
    };
    const search = "?isQuestion&author=author-123";

    cy.mount(
      <FilterPanel
        {...createDefaultProps({
          authorInfo,
          categories: new Set(["isQuestion"]),
          search,
        })}
      />,
    );

    cy.get('button[aria-label="Clear filter: Question"]').should("be.visible");
    cy.get('button[aria-label="Clear filter: Ada Lovelace"]').should(
      "be.visible",
    );

    cy.checkAccessibility("body");
  });
});
