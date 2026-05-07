import { Button } from "@chakra-ui/react";
import { NotificationDot } from "./NotificationDot";

describe("NotificationDot", { tags: ["@group4"] }, () => {
  describe("visibility", () => {
    it("displays the red dot when show is true", () => {
      cy.mount(
        <NotificationDot show={true}>
          <Button>Notifications</Button>
        </NotificationDot>,
      );

      cy.contains("🔴").should("exist");

      cy.checkAccessibility("body");
    });

    it("hides the red dot when show is false", () => {
      cy.mount(
        <NotificationDot show={false}>
          <Button>Notifications</Button>
        </NotificationDot>,
      );

      cy.contains("🔴").should("not.exist");

      cy.checkAccessibility("body");
    });
  });

  describe("children rendering", () => {
    it("renders children when show is true", () => {
      cy.mount(
        <NotificationDot show={true}>
          <Button>Click me</Button>
        </NotificationDot>,
      );

      cy.get("button").should("contain.text", "Click me");
      cy.contains("🔴").should("exist");

      cy.checkAccessibility("body");
    });

    it("renders children when show is false", () => {
      cy.mount(
        <NotificationDot show={false}>
          <Button>Click me</Button>
        </NotificationDot>,
      );

      cy.get("button").should("contain.text", "Click me");
      cy.contains("🔴").should("not.exist");

      cy.checkAccessibility("body");
    });
  });
});
