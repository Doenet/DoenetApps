type QueueTab = "Pending" | "Under Review" | "Rejected" | "Published";

/**
 * Create a public document and request that it be curated, then move the
 * request to `tab` in the curation queue. The request is made by a fresh
 * author unless `curatorIsRequester`, in which case the curator requests
 * curation of their own document. Yields the name of the document.
 */
function createCurationRequest({
  tab,
  curatorIsAuthor,
  curatorIsRequester,
}: {
  tab: QueueTab;
  curatorIsAuthor: boolean;
  curatorIsRequester: boolean;
}) {
  const code = Date.now().toString();
  const activityName = `Curation request ${tab} ${code}`;
  const curatorEmail = `curator${code}@doenet.org`;

  if (curatorIsRequester) {
    cy.loginAsTestUser({
      email: curatorEmail,
      isEditor: true,
      isAuthor: curatorIsAuthor,
    });
  } else {
    cy.loginAsTestUser({ isAuthor: true });
  }
  cy.createContent({
    name: activityName,
    doenetML: "Hello from the curation queue!",
    makePublic: true,
  }).then((contentId) => {
    cy.request({
      method: "POST",
      url: "/api/curate/suggestToBeCurated",
      body: { contentId },
    }).then((resp) => {
      const libraryId: string = resp.body.contentIdInLibrary;

      cy.loginAsTestUser({
        email: curatorEmail,
        isEditor: true,
        isAuthor: curatorIsAuthor,
      });

      if (tab !== "Pending") {
        cy.request({
          method: "POST",
          url: "/api/curate/claimOwnershipOfReview",
          body: { contentId: libraryId },
        });
      }
      if (tab === "Rejected") {
        cy.request({
          method: "POST",
          url: "/api/curate/rejectActivity",
          body: { contentId: libraryId },
        });
      } else if (tab === "Published") {
        cy.request({
          method: "POST",
          url: "/api/curate/publishActivityToLibrary",
          body: { contentId: libraryId },
        });
      }
    });
  });

  return cy.wrap(activityName);
}

describe("Curation Tests", { tags: ["@group3"] }, function () {
  const cases: {
    tab: QueueTab;
    curatorIsAuthor: boolean;
    curatorIsRequester: boolean;
  }[] = [
    { tab: "Pending", curatorIsAuthor: true, curatorIsRequester: false },
    { tab: "Pending", curatorIsAuthor: false, curatorIsRequester: false },
    { tab: "Pending", curatorIsAuthor: true, curatorIsRequester: true },
    { tab: "Under Review", curatorIsAuthor: true, curatorIsRequester: false },
    { tab: "Rejected", curatorIsAuthor: true, curatorIsRequester: false },
    { tab: "Published", curatorIsAuthor: true, curatorIsRequester: false },
  ];

  for (const { tab, curatorIsAuthor, curatorIsRequester } of cases) {
    const curatorDescription = [
      curatorIsAuthor ? "in author mode" : "not in author mode",
      curatorIsRequester ? "who requested curation" : null,
    ]
      .filter(Boolean)
      .join(", ");

    it(`curator ${curatorDescription} can open a ${tab.toLowerCase()} activity from the curate page`, () => {
      createCurationRequest({ tab, curatorIsAuthor, curatorIsRequester }).then(
        (activityName) => {
          // Once the editor has rendered the document, it records the audit
          // results and then refreshes the sharing state, which must succeed.
          cy.intercept("PUT", "/api/content/*/audit").as("audit");
          cy.intercept("GET", "/api/editor/getEditorShareStatus/*").as(
            "shareStatus",
          );

          cy.visit("/curate");

          cy.get(`[data-test="${tab} Tab"]`).click();
          cy.get(`[data-test="${tab} Results"]`)
            .contains('[data-test="Content Card"]', activityName)
            .find("a")
            .click();

          cy.location("pathname").should(
            "match",
            /^\/documentEditor\/[^/]+\/(edit|view)$/,
          );
          cy.location("search").should("eq", "?curate");
          cy.title().should("eq", `${activityName} - Doenet`);

          cy.wait("@audit", { timeout: 30000 });
          cy.wait("@shareStatus").its("response.statusCode").should("eq", 200);

          cy.contains("We are very sorry").should("not.exist");
          cy.contains("Panel only visible to library editors").should(
            "be.visible",
          );
          cy.contains("Status:").should("be.visible");
        },
      );
    });
  }
});
