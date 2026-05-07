import {
  ChangeNameAnonymousComponent,
  ChangeNameFormComponent,
} from "./ChangeName";
import { UserInfoWithEmail } from "../types";

describe("ChangeName component tests", { tags: ["@group1"] }, () => {
  describe("ChangeNameAnonymousComponent", () => {
    it("renders the anonymous user message", () => {
      const user: UserInfoWithEmail = {
        userId: "550e8400-e29b-41d4-a716-446655440000" as any,
        isAnonymous: true,
        lastNames: "Student",
        firstNames: null,
        email: null,
      };

      cy.mount(
        <ChangeNameAnonymousComponent user={user} onContinue={() => {}} />,
      );

      cy.contains("Taking assignment as an anonymous user").should(
        "be.visible",
      );
      cy.contains("Your nickname is").should("be.visible");
      cy.contains("Student").should("be.visible");
      cy.contains("Continue").should("be.visible");
      cy.checkAccessibility("body");
    });

    it("calls onContinue when continue button is clicked", () => {
      const onContinue = cy.stub();

      const user: UserInfoWithEmail = {
        userId: "550e8400-e29b-41d4-a716-446655440000" as any,
        isAnonymous: true,
        lastNames: "TestUser",
        firstNames: null,
        email: null,
      };

      cy.mount(
        <ChangeNameAnonymousComponent user={user} onContinue={onContinue} />,
      );

      cy.contains("Continue").click();

      cy.then(() => {
        return expect(onContinue.called).to.be.true;
      });

      cy.checkAccessibility("body");
    });
  });

  describe("ChangeNameFormComponent", () => {
    it("renders form with empty names", () => {
      cy.mount(
        <ChangeNameFormComponent
          firstNames=""
          lastNames=""
          setFirstNames={() => {}}
          setLastNames={() => {}}
          redirectTo="/"
        />,
      );

      cy.contains("Enter your name").should("be.visible");
      cy.contains("First name(s):").should("be.visible");
      cy.contains("Last name(s):").should("be.visible");
      cy.contains("Submit").should("be.visible");
      cy.checkAccessibility("body");
    });

    it("renders form with initial name values", () => {
      cy.mount(
        <ChangeNameFormComponent
          firstNames="John"
          lastNames="Doe"
          setFirstNames={() => {}}
          setLastNames={() => {}}
          redirectTo="/"
        />,
      );

      cy.get('input[name="firstNames"]').should("have.value", "John");
      cy.get('input[name="lastNames"]').should("have.value", "Doe");
      cy.checkAccessibility("body");
    });

    it("calls setFirstNames when first name input changes", () => {
      const setFirstNames = cy.stub();

      cy.mount(
        <ChangeNameFormComponent
          firstNames="John"
          lastNames="Doe"
          setFirstNames={setFirstNames}
          setLastNames={() => {}}
          redirectTo="/"
        />,
      );

      cy.get('input[name="firstNames"]')
        .type("Smith")
        .then(() => {
          expect(setFirstNames.callCount).to.be.greaterThan(0);
        });

      cy.checkAccessibility("body");
    });

    it("calls setLastNames when last name input changes", () => {
      const setLastNames = cy.stub();

      cy.mount(
        <ChangeNameFormComponent
          firstNames="Jane"
          lastNames="Smith"
          setFirstNames={() => {}}
          setLastNames={setLastNames}
          redirectTo="/"
        />,
      );

      cy.get('input[name="lastNames"]')
        .type("Johnson")
        .then(() => {
          expect(setLastNames.callCount).to.be.greaterThan(0);
        });

      cy.checkAccessibility("body");
    });

    it("disables submit button when form is submitted", () => {
      cy.mount(
        <ChangeNameFormComponent
          firstNames="John"
          lastNames="Doe"
          setFirstNames={() => {}}
          setLastNames={() => {}}
          redirectTo="/"
        />,
      );

      cy.contains("Submit").should("not.be.disabled");
      cy.get("form").submit();
      cy.contains("Submit").should("be.disabled");
      cy.checkAccessibility("body");
    });

    it("includes correct hidden form fields", () => {
      cy.mount(
        <ChangeNameFormComponent
          firstNames="John"
          lastNames="Doe"
          setFirstNames={() => {}}
          setLastNames={() => {}}
          redirectTo="/home"
        />,
      );

      cy.get('input[name="_action"]').should("have.value", "change user name");
      cy.get('input[name="redirectTo"]').should("have.value", "/home");
      cy.get('input[name="_isEditable"]').should("have.value", "true");
      cy.checkAccessibility("body");
    });

    it("has correct aria attributes for required fields", () => {
      cy.mount(
        <ChangeNameFormComponent
          firstNames=""
          lastNames=""
          setFirstNames={() => {}}
          setLastNames={() => {}}
          redirectTo="/"
        />,
      );

      cy.get('input[name="lastNames"]').should("have.attr", "required");
      cy.checkAccessibility("body");
    });

    it("supports multiple word names", () => {
      cy.mount(
        <ChangeNameFormComponent
          firstNames="Mary Jane"
          lastNames="van der Berg"
          setFirstNames={() => {}}
          setLastNames={() => {}}
          redirectTo="/"
        />,
      );

      cy.get('input[name="firstNames"]').should("have.value", "Mary Jane");
      cy.get('input[name="lastNames"]').should("have.value", "van der Berg");
      cy.checkAccessibility("body");
    });
  });
});
