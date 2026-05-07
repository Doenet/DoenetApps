import Searchbar from "./SearchBar";

describe("SearchBar", { tags: ["@group4"] }, () => {
  // No-op handler to prevent React warning about controlled inputs without onChange
  const noOpChange = () => {};

  describe("rendering", () => {
    it("renders the search input, test accessibility", () => {
      cy.mount(
        <Searchbar value="" dataTest="search-input" onChange={noOpChange} />,
      );

      cy.get('input[type="search"]').should("exist");

      cy.checkAccessibility("body");
    });

    it("renders the search button", () => {
      cy.mount(
        <Searchbar value="" dataTest="search-input" onChange={noOpChange} />,
      );

      cy.get("button").should("contain.text", "Search");
    });

    it("renders the search icon", () => {
      cy.mount(
        <Searchbar value="" dataTest="search-input" onChange={noOpChange} />,
      );

      // Icon is rendered as an SVG element
      cy.get("svg").should("exist");
    });

    it("renders placeholder text", () => {
      cy.mount(
        <Searchbar value="" dataTest="search-input" onChange={noOpChange} />,
      );

      cy.get('input[type="search"]').should(
        "have.attr",
        "placeholder",
        "Search...",
      );
    });
  });

  describe("input behavior", () => {
    it("displays the provided value", () => {
      cy.mount(
        <Searchbar
          value="test query"
          dataTest="search-input"
          onChange={noOpChange}
        />,
      );

      cy.get('input[type="search"]').should("have.value", "test query");

      cy.checkAccessibility("body");
    });

    it("calls both onInput and onChange when typing", () => {
      const handleInput = cy.stub().as("handleInput");
      const handleChange = cy.stub().as("handleChange");

      cy.mount(
        <Searchbar
          value=""
          dataTest="search-input"
          onInput={handleInput}
          onChange={handleChange}
        />,
      );

      cy.get('input[type="search"]').type("test");

      cy.get("@handleInput").should("have.been.called");
      cy.get("@handleChange").should("have.been.called");

      cy.checkAccessibility("body");
    });
  });

  describe("attributes", () => {
    it("uses default name 'q'", () => {
      cy.mount(
        <Searchbar value="" dataTest="search-input" onChange={noOpChange} />,
      );

      cy.get('input[type="search"]').should("have.attr", "name", "q");

      cy.checkAccessibility("body");
    });

    it("uses custom name when provided", () => {
      cy.mount(
        <Searchbar
          value=""
          name="search"
          dataTest="search-input"
          onChange={noOpChange}
        />,
      );

      cy.get('input[type="search"]').should("have.attr", "name", "search");

      cy.checkAccessibility("body");
    });
  });
});
