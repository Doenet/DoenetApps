import { mount } from "cypress/react";
import { ChakraProvider } from "@chakra-ui/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import Card, { CardContent } from "./Card";
import { SiteContext } from "../paths/SiteHeader";
import { theme } from "../theme";

// Minimal SiteContext for tests
const mockSiteContext: SiteContext = {
  user: undefined,
  exploreTab: null,
  setExploreTab: () => {},
  addTo: null,
  setAddTo: () => {},
  allLicenses: [],
  allDoenetmlVersions: [],
};

// Minimal card content fixture
const mockCardContent: CardContent = {
  content: {
    contentId: "test-id-1234-5678-9012-345678901234",
    ownerId: "owner-id-1234-5678-9012-345678901234",
    name: "Test Document",
    isPublic: false,
    visibility: "private",
    isShared: false,
    sharedWith: [],
    licenseCode: null,
    categories: [],
    classifications: [],
    parent: null,
    type: "singleDoc",
    numVariants: 1,
    doenetML: "",
    doenetmlVersion: {
      id: 1,
      displayedVersion: "0.7",
      fullVersion: "0.7.0",
      default: true,
      deprecated: false,
      removed: false,
      deprecationMessage: "",
    },
  },
};

// Mount Card inside a router that provides the outlet context.
function mountCard(
  props: Partial<React.ComponentProps<typeof Card>> & {
    cardContent?: CardContent;
  } = {},
) {
  const {
    cardContent = mockCardContent,
    includeSelectionBox = false,
    isSelected = false,
    onSelected,
    onDeselected,
    disableSelect = false,
    disableAsSelected = false,
    idx = 0,
  } = props;

  const CardChild = () => (
    <Card
      cardContent={cardContent}
      includeSelectionBox={includeSelectionBox}
      isSelected={isSelected}
      onSelected={onSelected}
      onDeselected={onDeselected}
      disableSelect={disableSelect}
      disableAsSelected={disableAsSelected}
      idx={idx}
    />
  );

  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <ChakraProvider theme={theme}>
          <Outlet context={mockSiteContext} />
        </ChakraProvider>
      ),
      children: [{ index: true, element: <CardChild /> }],
    },
  ]);

  return mount(<RouterProvider router={router} />);
}

describe("Card", { tags: ["@group4"] }, () => {
  describe("selection checkbox", () => {
    it("does not render checkbox when includeSelectionBox is false", () => {
      mountCard({ includeSelectionBox: false });
      cy.get('[data-test="Card Select"]').should("not.exist");
    });

    it("renders checkbox when includeSelectionBox is true", () => {
      mountCard({ includeSelectionBox: true });
      cy.get('[data-test="Card Select"]').should("exist");
    });

    it("calls onSelected when clicking the checkbox", () => {
      const onSelected = cy.stub().as("onSelected");
      mountCard({ includeSelectionBox: true, isSelected: false, onSelected });
      cy.get('[data-test="Card Select"]').click();
      cy.get("@onSelected").should("have.been.calledOnce");
    });

    it("calls onDeselected when clicking a selected checkbox", () => {
      const onDeselected = cy.stub().as("onDeselected");
      mountCard({
        includeSelectionBox: true,
        isSelected: true,
        onDeselected,
      });
      cy.get('[data-test="Card Select"]').click();
      cy.get("@onDeselected").should("have.been.calledOnce");
    });

    it("calls onSelected when clicking above the checkbox in the row", () => {
      const onSelected = cy.stub().as("onSelected");
      mountCard({ includeSelectionBox: true, isSelected: false, onSelected });

      // Click the top edge of the row wrapper (above the checkbox square itself)
      cy.get('[data-test="Content Card"]')
        .find('[data-test="Card Select"]')
        .parent() // the Flex wrapper
        .click("top");

      cy.get("@onSelected").should("have.been.calledOnce");
    });

    it("calls onSelected when clicking below the checkbox in the row", () => {
      const onSelected = cy.stub().as("onSelected");
      mountCard({ includeSelectionBox: true, isSelected: false, onSelected });

      cy.get('[data-test="Content Card"]')
        .find('[data-test="Card Select"]')
        .parent() // the Flex wrapper
        .click("bottom");

      cy.get("@onSelected").should("have.been.calledOnce");
    });

    it("does not call onSelected when disableSelect is true", () => {
      const onSelected = cy.stub().as("onSelected");
      mountCard({
        includeSelectionBox: true,
        isSelected: false,
        onSelected,
        disableSelect: true,
      });

      // Clicking the wrapper should not trigger selection
      cy.get('[data-test="Content Card"]')
        .find('[data-test="Card Select"]')
        .parent()
        .click("top");

      cy.get("@onSelected").should("not.have.been.called");
    });

    it("uses large checkbox size for better visibility", () => {
      mountCard({ includeSelectionBox: true });
      // Chakra size="lg" sets the checkbox control to 20px
      cy.get('[data-test="Card Select"]')
        .find(".chakra-checkbox__control")
        .should("have.css", "width", "20px");
    });
  });
});
