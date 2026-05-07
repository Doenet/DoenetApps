import { DateTime } from "luxon";
import { ChatConversation } from "./ChatConversation";

describe("ChatConversation Component", { tags: ["@group3"] }, () => {
  it("renders empty state and is accessible", () => {
    cy.mount(
      <ChatConversation
        messages={[]}
        canComment={false}
        onAddComment={cy.stub()}
      />,
    );

    cy.contains("No messages yet.").should("be.visible");

    cy.checkAccessibility("body");
  });

  it("renders messages and is accessible", () => {
    const dateTime = DateTime.fromISO("2024-05-01T14:30:00.000Z");
    const { year: _, ...timeFormat } = DateTime.DATETIME_MED;
    const formatted = dateTime.toLocaleString(timeFormat);

    cy.mount(
      <ChatConversation
        messages={[
          {
            user: "Ada Lovelace",
            userIsMe: false,
            message: "Hello there",
            dateTime,
          },
        ]}
        canComment={false}
        onAddComment={cy.stub()}
      />,
    );

    cy.contains("Ada Lovelace").should("be.visible");
    cy.contains("Hello there").should("be.visible");
    cy.contains(formatted).should("be.visible");

    cy.checkAccessibility("body");
  });

  it("allows posting a comment", () => {
    const onAddComment = cy.spy().as("onAddComment");

    cy.mount(
      <ChatConversation
        messages={[]}
        canComment={true}
        onAddComment={onAddComment}
      />,
    );

    cy.contains("button", "Post").should("be.disabled");

    cy.get("textarea").type("New comment");
    cy.contains("button", "Post").should("not.be.disabled").click();

    cy.get("@onAddComment").should("have.been.calledWith", "New comment");
    cy.get("textarea").should("have.value", "");

    cy.checkAccessibility("body");
  });
});
