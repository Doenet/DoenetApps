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

/**
 * Create a library folder named `name` as the logged-in curator and yield its id.
 */
function createLibraryFolder(name: string) {
  cy.request({
    method: "POST",
    url: "/api/curate/createCurationFolder",
    body: { name, parentId: null },
  });
  return cy.request("/api/curate/getCurationFolderContent/").then((resp) => {
    const folder = (
      resp.body.content as { contentId: string; name: string }[]
    ).find((c) => c.name === name);
    expect(folder, `library folder ${name}`).not.to.equal(undefined);
    return folder!.contentId;
  });
}

/**
 * As the logged-in curator, create a public document and request that it be
 * curated, publishing the library copy if `publish`. Moves the library copy to
 * the end of `folderId`. Yields the ids of the source and the library copy.
 */
function addLibraryContent({
  name,
  folderId,
  publish,
}: {
  name: string;
  folderId: string;
  publish: boolean;
}) {
  return cy
    .createContent({ name, doenetML: `<p>${name}</p>`, makePublic: true })
    .then((sourceId) =>
      cy
        .request({
          method: "POST",
          url: "/api/curate/suggestToBeCurated",
          body: { contentId: sourceId },
        })
        .then((resp) => {
          const libraryId: string = resp.body.contentIdInLibrary;
          if (publish) {
            cy.request({
              method: "POST",
              url: "/api/curate/claimOwnershipOfReview",
              body: { contentId: libraryId },
            });
            cy.request({
              method: "POST",
              url: "/api/curate/publishActivityToLibrary",
              body: { contentId: libraryId },
            });
          }
          cy.request({
            method: "POST",
            url: "/api/copyMove/moveContent",
            body: {
              contentId: libraryId,
              changeParentIdTo: folderId,
              desiredPosition: 1000,
            },
          });
          return cy.wrap({ sourceId, libraryId });
        }),
    );
}

/**
 * Assert that the content cards show `expected`, in order, ignoring cards that
 * show none of `expected`. Retries until the cards match.
 */
function cardOrderShouldBe(expected: string[]) {
  cy.get('[data-test="Content Card"]').should(($cards) => {
    const shown = [...$cards]
      .map((card) => expected.find((name) => card.textContent!.includes(name)))
      .filter((name) => name !== undefined);
    expect(shown).to.deep.equal(expected);
  });
}

function openCardMenu(name: string) {
  cy.contains('[data-test="Content Card"]', name)
    .find('[data-test="Card Menu Button"]')
    .click();
}

describe("Library content Tests", { tags: ["@group3"] }, function () {
  let code: string;
  beforeEach(() => {
    code = Date.now().toString();
    cy.loginAsTestUser({
      email: `curator${code}@doenet.org`,
      isEditor: true,
      isAuthor: true,
    });
  });

  it("curator reorders library content around hidden drafts", () => {
    const [a, hidden1, hidden2, b, c] = ["A", "H1", "H2", "B", "C"].map(
      (letter) => `Library order ${letter} ${code}`,
    );

    createLibraryFolder(`Library order folder ${code}`).then((folderId) => {
      // Drafts that are not yet published are private and not listed
      addLibraryContent({ name: a, folderId, publish: true });
      addLibraryContent({ name: hidden1, folderId, publish: false });
      addLibraryContent({ name: hidden2, folderId, publish: false });
      addLibraryContent({ name: b, folderId, publish: true });
      addLibraryContent({ name: c, folderId, publish: true });

      cy.visit(`/libraryActivities/${folderId}`);
      cardOrderShouldBe([a, b, c]);
      cy.contains('[data-test="Content Card"]', hidden1).should("not.exist");
      cy.contains('[data-test="Content Card"]', hidden2).should("not.exist");

      cy.intercept("POST", "/api/copyMove/moveContent").as("move");

      openCardMenu(b);
      cy.get('[data-test="Move Down Menu Item"]:visible').click();
      cy.wait("@move").its("response.statusCode").should("eq", 200);
      cardOrderShouldBe([a, c, b]);

      openCardMenu(b);
      cy.get('[data-test="Move Up Menu Item"]:visible').click();
      cy.wait("@move").its("response.statusCode").should("eq", 200);
      cardOrderShouldBe([a, b, c]);

      cy.reload();
      cardOrderShouldBe([a, b, c]);
    });
  });

  it("curator is not offered to trash a library draft", () => {
    const draft = `Library draft ${code}`;

    createLibraryFolder(`Library draft folder ${code}`).then((folderId) => {
      addLibraryContent({ name: draft, folderId, publish: false });

      // Drafts are only listed in search results
      cy.visit(`/libraryActivities/${folderId}?q=${encodeURIComponent(draft)}`);
      openCardMenu(draft);
      cy.get('[data-test="Go to containing folder"]:visible').should("exist");
      cy.get('[data-test="Delete Draft"]').should("not.exist");
      cy.contains('[role="menuitem"]:visible', "Move to trash").should(
        "not.exist",
      );
    });
  });

  it("curator is not offered to update library content from a changed remix source", () => {
    const name = `Library compare ${code}`;

    createLibraryFolder(`Library compare folder ${code}`).then((folderId) => {
      addLibraryContent({ name, folderId, publish: false }).then(
        ({ sourceId, libraryId }) => {
          cy.request({
            method: "POST",
            url: "/api/updateContent/saveDoenetML",
            body: {
              contentId: sourceId,
              doenetML: "<p>Changed by the author</p>",
              numVariants: 1,
            },
          });

          cy.request(`/api/editor/getEditor/${libraryId}`)
            .its("body.remixSourceHasChanged")
            .should("eq", true);

          cy.visit(`/documentEditor/${libraryId}/edit?curate`);
          cy.get('[data-test="Library Editor Controls"]').should("be.visible");
          cy.get('[aria-label="View remixes"]')
            .parent()
            .should("not.contain.text", "\u{1f534}");

          cy.visit(`/activityCompare/${libraryId}/${sourceId}`);
          cy.contains("Remix source:").should("be.visible");
          cy.contains("button", "Possible update actions").should("not.exist");
          cy.contains("button", "Already matches").should("not.exist");
        },
      );
    });
  });
});
