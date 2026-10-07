import { AccountIconAndCard } from "./AccountIconAndCard";
import { UserInfoWithEmail } from "../../types";

const user = {
  userId: "user-1",
  firstNames: "Test",
  lastNames: "User",
  isAnonymous: false,
  isAuthor: true,
  email: "test.user@example.com",
} as UserInfoWithEmail;

describe("AccountIconAndCard", { tags: ["@group4"] }, () => {
  it("keeps the account menu open when a theme option is selected", () => {
    cy.mount(
      <AccountIconAndCard
        user={user}
        themeSetting="system"
        setThemeSetting={cy.stub().as("setThemeSetting")}
      />,
    );

    // Menu closed initially, then open it via the avatar button.
    cy.get('[data-test="Theme Dark"]').should("not.exist");
    cy.get("button").first().click();
    cy.get('[data-test="Theme Dark"]').should("be.visible");

    // Selecting a theme reports the choice but must NOT close the menu (the
    // reason for a radio group rather than MenuItemOptions).
    cy.get('[data-test="Theme Dark"]').click();
    cy.get("@setThemeSetting").should("have.been.calledWith", "dark");
    cy.get('[data-test="Theme Dark"]').should("be.visible");
    cy.contains("Log Out").should("be.visible");
  });
});
