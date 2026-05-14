import { Button, Text, VStack } from "@chakra-ui/react";
import { Outlet } from "react-router";

import { useShareController } from "./useShareController";

describe("useShareController", { tags: ["@group3"] }, () => {
  const contentId = "content-123";

  function ShareControllerHarness({
    visibility = "private",
    contentType = "sequence",
    inLibrary = false,
    isSubActivity = false,
    beforeShareModalOpens,
  }: {
    visibility?: "private" | "unlisted" | "public";
    contentType?: "sequence" | "singleDoc" | "folder";
    inLibrary?: boolean;
    isSubActivity?: boolean;
    beforeShareModalOpens?: () => Promise<void>;
  }) {
    const {
      modalIsOpen: isOpen,
      openModal: openShareModal,
      groundTruth: sharingFacts,
      optimisticVisibility,
      setOptimisticVisibility,
      shouldShowPublicComplianceWarning,
    } = useShareController({
      contentId,
      contentType,
      visibility,
      inLibrary,
      isSubActivity,
      beforeShareModalOpens,
    });

    return (
      <VStack align="stretch">
        <Text data-test="Is Open">{String(isOpen)}</Text>
        <Text data-test="Optimistic Visibility">{optimisticVisibility}</Text>
        <Text data-test="Show Compliance Warning">
          {String(shouldShowPublicComplianceWarning)}
        </Text>
        <Text data-test="Can Share Publicly">
          {sharingFacts ? String(sharingFacts.canSharePublicly) : "missing"}
        </Text>
        <Button
          data-test="Open Share Modal"
          onClick={() => void openShareModal()}
        >
          Open share modal
        </Button>
        <Button
          data-test="Set Public Visibility"
          onClick={() => setOptimisticVisibility("public")}
        >
          Set optimistic visibility
        </Button>
      </VStack>
    );
  }

  it("loads share status automatically when public warning checks are enabled", () => {
    const loaderSpy = cy.spy().as("loaderSpy");

    cy.mount(<Outlet />, {
      routerProps: { initialEntries: ["/"] },
      routes: [
        {
          path: "/",
          element: <ShareControllerHarness visibility="public" />,
        },
        {
          path: `/loadShareStatus/${contentId}`,
          loader: () => {
            loaderSpy();
            return {
              visibility: "public",
              parentVisibility: "private",
              canSharePublicly: false,
              publicShareIssues: ["missingRequiredCategories"],
              sharedWith: [],
              parentSharedWith: [],
            };
          },
        },
      ],
    } as any);

    cy.get("@loaderSpy").should("have.been.calledOnce");
    cy.get('[data-test="Show Compliance Warning"]').should("have.text", "true");
    cy.get('[data-test="Can Share Publicly"]').should("have.text", "false");
  });

  it("does not auto-load when warning checks are disabled", () => {
    const loaderSpy = cy.spy().as("loaderSpy");

    cy.mount(<Outlet />, {
      routerProps: { initialEntries: ["/"] },
      routes: [
        {
          path: "/",
          element: (
            <ShareControllerHarness visibility="private" inLibrary={true} />
          ),
        },
        {
          path: `/loadShareStatus/${contentId}`,
          loader: () => {
            loaderSpy();
            return {
              visibility: "private",
              parentVisibility: "private",
              canSharePublicly: true,
              publicShareIssues: [],
              sharedWith: [],
              parentSharedWith: [],
            };
          },
        },
      ],
    } as any);

    cy.get('[data-test="Show Compliance Warning"]').should(
      "have.text",
      "false",
    );
    cy.get('[data-test="Can Share Publicly"]').should("have.text", "missing");
    cy.get("@loaderSpy").should("not.have.been.called");
  });

  it("waits for beforeShareModalOpens before opening and reloading", () => {
    const loaderSpy = cy.spy().as("loaderSpy");
    let resolvePrepare: (() => void) | null = null;

    const beforeShareModalOpens = () =>
      new Promise<void>((resolve) => {
        resolvePrepare = resolve;
      });

    cy.mount(<Outlet />, {
      routerProps: { initialEntries: ["/"] },
      routes: [
        {
          path: "/",
          element: (
            <ShareControllerHarness
              visibility="private"
              beforeShareModalOpens={beforeShareModalOpens}
            />
          ),
        },
        {
          path: `/loadShareStatus/${contentId}`,
          loader: () => {
            loaderSpy();
            return {
              visibility: "private",
              parentVisibility: "private",
              canSharePublicly: true,
              publicShareIssues: [],
              sharedWith: [],
              parentSharedWith: [],
            };
          },
        },
      ],
    } as any);

    cy.get('[data-test="Open Share Modal"]').click();
    cy.get('[data-test="Is Open"]').should("have.text", "false");
    cy.get("@loaderSpy").should("not.have.been.called");

    cy.then(() => {
      resolvePrepare?.();
    });

    cy.get('[data-test="Is Open"]').should("have.text", "true");
    cy.get("@loaderSpy").should("have.been.calledOnce");
  });
});
