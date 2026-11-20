# Migrating to the Doenet API design

Companion to [API_DESIGN.md](./API_DESIGN.md): what the current API looks like, which new endpoint replaces each current route, and how the move is made without breaking running clients. Content types are named as the design names them (`document`, `problemSet`); the handlers translate to the database enum (`singleDoc`, `sequence`). The design assumes six data-model changes ([Data-model changes first](#data-model-changes-first)); the mapping below is written for the model after them. Terms are those of `CONTEXT.md`.

## Where we are

Both inventories were taken from the code on `main` at the time of writing (the route list is `apps/api/contract-uncovered.json`).

**Surface.** About 110 `/api` routes. One (`getAssigned`) is a covered operation; the rest are Express routes with a Zod input schema and no response schema. The app calls one operation through the typed client; everything else is raw `axios` (40 files on the ESLint suppression list) or `fetcher.submit({ path, ...body })` through `genericAction`.

**Screen-shaped responses.** Eighteen routes return a bundle assembled for one page. The clearest cases:

- `getMyContent`, `searchMyContent`, `getCurationFolderContent`, `searchCurationFolderContent` and `getCurationQueue` each return a folder listing **plus** every category, every DoenetML version and every license. The app's root loader has already fetched two of those three lists on the same page load. `content_list.ts` carries a TODO asking whether the extra data is needed.
- `getEditor`, `getEditorSettings`, `getEditorShareStatus`, `getDocEditorHistory`, `getCompoundEditorView`, `getCompoundEditorEdit`, `getContentDescription`: one route per editor tab, each a different slice of the same content row plus whatever that tab's React component wanted.
- `getAssignmentResponseStudent`: student info, the assignment, overall scores, item names, the whole class roster, and then either one attempt's state with response counts or all attempt scores, selected by query parameters.
- `searchExplore` and `browseExplore`: 15 and 12 independent result sets each from its own query, sent as `POST`.
- `getActivityViewerData`: content tree plus remix sources plus library relations.

About seventy routes are called from exactly one page or component. Content lists (every one except Explore) ship the full DoenetML source of every document in the folder.

**Round trips.** No loader in the app runs its calls in parallel (the only `Promise.all` is in a menu popup). Serial chains with no data dependency:

| Page                     | Chain                                                                      | Depth |
| ------------------------ | -------------------------------------------------------------------------- | ----- |
| Every page (root loader) | `getMyUserInfo` → `getAllLicenses` → `getAllDoenetmlVersions`              | 3     |
| Explore                  | `getAllCategories` → `browseExplore` / `searchExplore`                     | 2     |
| Editor (header)          | `getEditor` → `getContentDescription`                                      | 2     |
| Editor settings tab      | `getEditorSettings` → `getAllCategories` → `getRemixSources`               | 3     |
| Editor remixes tab       | `getRemixSources` → `getRemixes`                                           | 2     |
| Editor library tab       | `getLibraryRelations` → `getComments`                                      | 2     |
| Shared activities        | `getSharedContent` → `getUser`                                             | 2     |
| Assignment viewer        | `getMyUserInfo` → [`login/anonymous`] → `code/:code` → `getAssignmentData` | 3–4   |
| Content info drawer      | `getRemixSources` → `getRemixes`                                           | 2     |
| Add-to menu              | `getRecentContent` → 3 × `checkIfContentContains`                          | 2     |

The root loader runs on every page and on every revalidation, so an editor settings page load today is 3 (root) in parallel with 2 (header) in parallel with 3 (settings): a critical path of three round trips before data is ready, and the same again after every mutation, since nothing defines `shouldRevalidate` and the reference lists are refetched each time.

**Per-request cost.** Every request runs three queries before its handler: the `Session` row, the `users` row in `deserializeUser`, and `getIsEditor` in most handlers. This is why bundled endpoints currently win on query count, and why the design caches the session user.

**Other findings the migration has to carry.**

- Reads with writes: `getEditor` and `getMyContent` record recent content; `getActivityViewerData` and `getSharedContent` record views; every score read may rewrite the score cache.
- Two visibility paths: `PATCH /content/:id/access` enforces the category and audit gates; the legacy `setContentIsPublic` (used by `ShareTable` and by `moveContent`) does not, and `publishActivityToLibrary` writes visibility directly.
- Authorization inconsistencies: `getCurationFolderContent` is not editor-gated but its search twin is; `getMoveCopyContentData` fetches the parent with no ownership filter; `recordSubmittedEvent` checks nothing about `contentId`; `getMyContent` returns `200 { notMe: true }` instead of `403`; `getEditor` is declared optional-auth but throws without a user; the metrics routes are open.
- Dead or wrong wiring: `/score/loadItemState` is bound to `loadState`; `getContentSource` strips its revision parameters; `updateContentSettings` accepts and ignores `activityLevelAttempts` and `itemLevelAttempts`; the settings page reads `isPublic`, `isShared` and `assigned` from a response that doesn't contain them; the editor's document/compound redirect tests `request.url.split("/")[0]`, which is never a path.
- Shape inconsistencies: five routes return bare arrays; many mutations return an empty body (`createCurationFolder` doesn't return the id it made); the same id is called `contentId`, `assignmentId`, `parentId`, `folderId`, `compareId`, `id`.
- Reads as `POST`: `searchExplore`, `browseExplore`, `getClassifications`.
- `getMyUserInfo` returns an empty body for a guest; `login/anonymous` returns `{ anonymous: true }` rather than the user it created; `logout` is a `GET` with side effects.

## Route mapping

Every current route and the endpoint under `/api/v1` that replaces it. "Same" means the handler is the existing query function with the bundling removed. Routes marked _internal_ stay outside the public document.

### Users and sign-in

| Current route                     | New operation                          | Notes                                       |
| --------------------------------- | -------------------------------------- | ------------------------------------------- |
| `GET /user/getMyUserInfo`         | `GET /v1/users/me`                     | `401` for a guest instead of an empty body. |
| `GET /user/getUser/:userId`       | `GET /v1/users/{userId}`               | Same.                                       |
| `POST /user/updateUser`           | `PATCH /v1/users/me`                   |                                             |
| `POST /user/setIsAuthor`          | `PATCH /v1/users/me`                   |                                             |
| `POST /user/setTheme`             | `PATCH /v1/users/me`                   |                                             |
| `POST /user/handles`              | `POST /v1/content/{folderId}/students` |                                             |
| `POST /auth/magiclink`            | `POST /v1/auth/magic-link`             | Internal.                                   |
| `GET /login/magiclink`            | `GET /v1/auth/magic-link/confirm`      | Internal.                                   |
| `POST /login/handle`              | `POST /v1/auth/handle`                 | Internal.                                   |
| `POST /login/anonymous`           | `POST /v1/auth/anonymous`              | Internal; returns the user.                 |
| `GET /login/google`               | `GET /v1/auth/google`                  | Internal, external callback.                |
| `GET /login/logout`               | `POST /v1/auth/logout`                 | Internal.                                   |
| `POST /login/createOrLoginAsTest` | unchanged                              | Test-only.                                  |
| `GET /discourse/sso`              | `GET /v1/auth/discourse/sso`           | Internal, external callback.                |

### Content

| Current route                                           | New operation                                                                                                    | Notes                                                                                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /editor/getEditor/:contentId`                      | `GET /v1/content/{contentId}?include=assignments,submission`                                                     | The recent-content write becomes `POST /v1/users/me/recent`.                                                                                                      |
| `GET /info/getContentDescription/:contentId`            | `GET /v1/content/{contentId}?include=ancestors`                                                                  | `hasBadVersion` becomes a field of the content.                                                                                                                   |
| `GET /editor/getEditorSettings/:contentId`              | `GET /v1/content/{contentId}?include=categories,classifications`                                                 |                                                                                                                                                                   |
| `GET /editor/getCompoundEditorEdit/:contentId`          | `GET /v1/content/{contentId}?include=children`                                                                   |                                                                                                                                                                   |
| `GET /editor/getCompoundEditorView/:contentId`          | `GET /v1/content/{contentId}/source`                                                                             | The problem set's tree with sources; the viewer assembles it.                                                                                                     |
| `GET /activityEditView/getActivityViewerData/:id`       | `GET /v1/content/{contentId}?include=children,owner,classifications,submission` + `…/source` + `…/remix-sources` | The view write becomes `POST /v1/content/{contentId}/views`.                                                                                                      |
| `GET /activityEditView/getPublicContent/:contentId`     | `GET /v1/content/{contentId}/source`                                                                             |                                                                                                                                                                   |
| `GET /activityEditView/getPublicContentByCid/:cid`      | `GET /v1/content/by-cid/{cid}/source`                                                                            |                                                                                                                                                                   |
| `GET /media/image/:contentId/details`                   | `GET /v1/content/{contentId}`                                                                                    |                                                                                                                                                                   |
| `POST /updateContent/createContent/`                    | `POST /v1/content`                                                                                               |                                                                                                                                                                   |
| `POST /copyMove/createContentCopyInChildren`            | `POST /v1/content` with `childrenCopiedFrom`                                                                     | Absorbs the follow-up rename.                                                                                                                                     |
| `POST /curate/createCurationFolder`                     | removed                                                                                                          | The library has no folders; it is `GET /v1/search/content?curated=true` organised by categories.                                                                  |
| `POST /updateContent/updateContentSettings`             | `PATCH /v1/content/{contentId}`                                                                                  |                                                                                                                                                                   |
| `POST /share/setContentLicense`                         | `PATCH /v1/content/{contentId}`                                                                                  |                                                                                                                                                                   |
| `PATCH /content/:contentId/access`                      | `PATCH /v1/content/{contentId}`                                                                                  | The gated path.                                                                                                                                                   |
| `POST /share/setContentIsPublic`                        | `PATCH /v1/content/{contentId}`                                                                                  | The ungated path is retired.                                                                                                                                      |
| `PATCH /media/image/attribution`                        | `PATCH /v1/content/{contentId}`                                                                                  |                                                                                                                                                                   |
| `POST /updateContent/deleteContent`                     | `DELETE /v1/content/{contentId}` or `POST /v1/content/trash`                                                     |                                                                                                                                                                   |
| `POST /updateContent/restoreDeletedContent`             | `POST /v1/content/restore`                                                                                       |                                                                                                                                                                   |
| `POST /copyMove/moveContent`                            | `POST /v1/content/move`                                                                                          | Bulk; goes through the gated visibility code.                                                                                                                     |
| `POST /copyMove/copyContent`                            | `POST /v1/content/copies`                                                                                        |                                                                                                                                                                   |
| `GET /contentList/getMyContent/:ownerId/:parentId?`     | `GET /v1/content/{folderId\|root}/children?include=…`                                                            | `403` instead of `notMe`; no reference data; no source in items.                                                                                                  |
| `GET /contentList/searchMyContent/:ownerId/:parentId?`  | `GET /v1/content/{folderId\|root}/children?q=`                                                                   |                                                                                                                                                                   |
| `GET /curate/getCurationFolderContent/:parentId?`       | `GET /v1/search/content?curated=true`                                                                            | The library is a search filter over published submissions.                                                                                                        |
| `GET /curate/searchCurationFolderContent/:parentId?`    | `GET /v1/search/content?curated=true&q=`                                                                         |                                                                                                                                                                   |
| `GET /contentList/getSharedContent/:ownerId/:parentId?` | `GET /v1/content/{rootFolderId\|folderId}/children`                                                              | The author's root folder id comes from `GET /v1/users/{userId}`; the page URL carries the folder id. The view write becomes `POST /v1/content/{contentId}/views`. |
| `GET /copyMove/getMoveCopyContentData/:parentId?`       | `GET /v1/content/{folderId}/children?include=parent,ancestors`                                                   | `canOpen` is `permissions` plus type; ownership applied to the parent.                                                                                            |
| `GET /copyMove/checkIfContentContains`                  | `GET /v1/content/{folderId}/children?type=&limit=1`                                                              |                                                                                                                                                                   |
| `GET /contentList/getMyTrash`                           | `GET /v1/users/me/trash`                                                                                         | `{ content, trashedAt }` items instead of parallel arrays.                                                                                                        |
| `GET /contentList/getSharedWithMe`                      | `GET /v1/users/me/shared-with-me`                                                                                |                                                                                                                                                                   |
| `GET /info/getRecentContent`                            | `GET /v1/users/me/recent`                                                                                        | Object response instead of a bare array.                                                                                                                          |

### Source, revisions, audit

| Current route                                       | New operation                                                  | Notes                                   |
| --------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| `GET /editor/getDocEditorDoenetML/:contentId`       | `GET /v1/content/{contentId}/source`                           | No longer loads every DoenetML version. |
| `GET /activityEditView/getContentSource/:contentId` | `GET /v1/content/{contentId}/source?revision=&format=`         | Revision mode reachable.                |
| `POST /updateContent/saveDoenetML`                  | `PUT /v1/content/{contentId}/source`                           |                                         |
| `POST /updateContent/saveSyntaxUpdate`              | `POST /v1/content/{contentId}/source/upgrades`                 |                                         |
| `GET /editor/getDocEditorHistory/:contentId`        | `GET /v1/content/{contentId}/revisions` + `…/source`           |                                         |
| `POST /updateContent/createContentRevision`         | `POST /v1/content/{contentId}/revisions`                       |                                         |
| `POST /updateContent/updateContentRevision`         | `PATCH /v1/content/{contentId}/revisions/{revisionNum}`        |                                         |
| `POST /updateContent/revertToRevision`              | `POST /v1/content/{contentId}/revisions/{revisionNum}/restore` |                                         |
| `PUT /content/:contentId/audit`                     | `PUT /v1/content/{contentId}/audit`                            | Same.                                   |

### Sharing, categories, classifications

| Current route                                        | New operation                                                       | Notes                  |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| `GET /editor/getEditorShareStatus/:contentId`        | `GET /v1/content/{contentId}/grants`                                |                        |
| `POST /share/shareContent`                           | `POST /v1/content/{contentId}/grants`                               |                        |
| `POST /share/unshareContent`                         | `DELETE /v1/content/{contentId}/grants/{userId}`                    |                        |
| `POST /updateContent/updateCategories`               | `PUT /v1/content/{contentId}/categories`                            |                        |
| `POST /classifications/addClassification`            | `POST /v1/content/{contentId}/classifications`                      |                        |
| `POST /classifications/removeClassification`         | `DELETE /v1/content/{contentId}/classifications/{classificationId}` |                        |
| `POST /classifications/getClassifications`           | `GET /v1/content/{contentId}?include=classifications`               | Unused by the app.     |
| `GET /classifications/getClassificationCategories`   | `GET /v1/classification-systems`                                    | Cached reference data. |
| `GET /classifications/searchPossibleClassifications` | `GET /v1/classifications?q=`                                        |                        |

### Remixes, comparison, library status

| Current route                                              | New operation                               | Notes                                                          |
| ---------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `GET /remix/getRemixSources/:contentId`                    | `GET /v1/content/{contentId}/remix-sources` |                                                                |
| `GET /remix/getRemixes/:contentId`                         | `GET /v1/content/{contentId}/remixes`       |                                                                |
| `POST /remix/updateRemixedContentToOrigin`                 | removed                                     | Remixes are provenance only; copy again for the newer version. |
| `POST /remix/updateOriginContentToRemix`                   | removed                                     | With editor grants, editing the origin is editing the origin.  |
| `GET /compare/getDoenetMLComparison/:contentId/:compareId` | removed                                     | The `cid` comparison in `remix-sources` replaces it.           |
| `GET /curate/getLibraryRelations/:contentId`               | `GET /v1/content/{contentId}/submission`    |                                                                |

### Assignments

| Current route                                                          | New operation                                                                                                                                                                           | Notes                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `POST /assign/createAssignment`                                        | `POST /v1/assignments`                                                                                                                                                                  | Pins a revision; no copy is made.      |
| `GET /assign/getAssignmentData/:assignmentId`                          | `GET /v1/assignments/{assignmentId}` + `…/source` + `…/attempts/me/latest`                                                                                                              |                                        |
| `POST /assign/updateAssignmentClosedOn`                                | `PATCH /v1/assignments/{assignmentId}`                                                                                                                                                  |                                        |
| `POST /assign/updateAssignmentMaxAttempts`                             | `PATCH /v1/assignments/{assignmentId}`                                                                                                                                                  |                                        |
| `POST /assign/updateAssignmentSettings`                                | `PATCH /v1/assignments/{assignmentId}`                                                                                                                                                  |                                        |
| `GET /code/:code`                                                      | `GET /v1/codes/{classCode}`                                                                                                                                                             |                                        |
| `GET /assign/getAssigned`                                              | `GET /v1/users/me/assignments`                                                                                                                                                          | Without the embedded user.             |
| `GET /assign/getAssignedScores`                                        | `GET /v1/users/me/scores`                                                                                                                                                               |                                        |
| `GET /assign/getStudentAssignmentScores/:studentUserId[/:parentId]`    | `GET /v1/users/{userId}/scores?course=`                                                                                                                                                 |                                        |
| `GET /assign/getAllAssignmentScores/:parentId`                         | `GET /v1/content/{folderId}/gradebook`                                                                                                                                                  |                                        |
| `GET /assign/getAssignmentResponseOverview/:contentId`                 | `GET /v1/assignments/{id}?include=content` + `…/scores?include=items`                                                                                                                   |                                        |
| `GET /assign/getAssignmentResponseStudent/:contentId[/:studentUserId]` | `GET /v1/assignments/{id}?include=content`, `…/scores/{userId}`, `…/attempts/{userId}` or `…/attempts/{userId}/{n}?item=` + `…/responses/counts`, `GET /v1/content/{courseId}/students` | Five resources instead of one bundle.  |
| `GET /assign/getStudentSubmittedResponses/:contentId/:studentUserId`   | `GET /v1/assignments/{assignmentId}/responses?userId=…`                                                                                                                                 |                                        |
| `POST /assign/recordSubmittedEvent`                                    | `POST /v1/assignments/{assignmentId}/responses`                                                                                                                                         | Gains the assignment permission check. |
| `GET /score/getScore`                                                  | `GET /v1/assignments/{assignmentId}/scores/{userId\|me}`                                                                                                                                |                                        |
| `GET /score/loadState`                                                 | `GET /v1/assignments/{assignmentId}/attempts/{userId\|me}/{n\|latest}`                                                                                                                  | `attemptNumber` becomes passable.      |
| `GET /score/loadItemState`                                             | same, with `item=&itemAttempt=`                                                                                                                                                         | Fixes the wiring to `loadState`.       |
| `POST /score/createNewAttempt`                                         | `POST /v1/assignments/{assignmentId}/attempts`                                                                                                                                          |                                        |
| `POST /score/saveScoreAndState`                                        | `PUT /v1/assignments/{assignmentId}/attempts/me/{attemptNumber}/state`                                                                                                                  |                                        |

### Library (curation)

| Current route                               | New operation                                           | Notes                               |
| ------------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `POST /curate/suggestToBeCurated`           | `POST /v1/library/submissions`                          |                                     |
| `GET /curate/getCurationQueue`              | `GET /v1/library/submissions?status=…&include=content`  | One list; no reference data.        |
| `POST /curate/claimOwnershipOfReview`       | `POST /v1/library/submissions/{submissionId}/claim`     |                                     |
| `POST /curate/publishActivityToLibrary`     | `POST /v1/library/submissions/{submissionId}/publish`   | Through the gated visibility code.  |
| `POST /curate/unpublishActivityFromLibrary` | `POST /v1/library/submissions/{submissionId}/unpublish` |                                     |
| `POST /curate/rejectActivity`               | `POST /v1/library/submissions/{submissionId}/reject`    |                                     |
| `GET /curate/getComments/:contentId`        | `GET /v1/library/submissions/{submissionId}/comments`   | Object response.                    |
| `POST /curate/addComment`                   | `POST /v1/library/submissions/{submissionId}/comments`  | `asEditor` derived from the caller. |

### Explore, reference data, images, other

| Current route                                   | New operation                                                                                               | Notes                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `POST /explore/searchExplore`                   | `GET /v1/search/content?q=&facets=` + `GET /v1/search/authors` + `GET /v1/users/{ownerId}`                  | `GET`, split into resources.         |
| `POST /explore/browseExplore`                   | `GET /v1/explore/trending` + `GET /v1/explore/recent` + `GET /v1/search/content` + `GET /v1/search/authors` |                                      |
| `GET /info/getAllCategories`                    | `GET /v1/categories`                                                                                        | Cached.                              |
| `GET /info/getAllDoenetmlVersions`              | `GET /v1/doenetml-versions`                                                                                 | Cached.                              |
| `GET /info/getDefaultDoenetmlVersion`           | `GET /v1/doenetml-versions`                                                                                 | The default is flagged in the list.  |
| `GET /info/getAllLicenses`                      | `GET /v1/licenses`                                                                                          | Cached.                              |
| `POST /media/image/init`                        | `POST /v1/images/uploads`                                                                                   |                                      |
| `POST /media/image/complete`                    | `POST /v1/images`                                                                                           |                                      |
| `GET /metrics/*`                                | unchanged                                                                                                   | Internal until an admin role exists. |
| `GET /health`, `GET /openapi.json`, `GET /docs` | unchanged                                                                                                   | Infrastructure.                      |
| `POST /test/*`                                  | unchanged                                                                                                   | Test-only.                           |

## Data-model changes first

The design assumes six changes to the data model. Each is its own expand-migrate-contract cycle on the current API, made before the resource work so that the new endpoints are built once, over the final model, rather than over copies and flags that are about to go.

1. **Access as grants.** Add `anyone` as a grantee kind and `role` to `contentShares`; write every `isPublic`/`visibility` as an `anyone` grant on the same rows; move the two visibility paths and the publishing gates onto the grant write; stop reading `visibility`. The cascade code in `src/access/` goes with the contract step.
2. **Root folders and one access filter.** One root folder row per account; top-level items reparented under it. Every current handler that reads `parentId = null` as "root" (the content lists, move/copy, `checkIfContentContains`, restore) changes in the same PR. Trash keeps the current model (`isDeletedOn` and `deletionRootId`, read as `trashedAt` and `trashRootId` on the wire): a trashed item stays at its parent, marked. The one access filter that every content query goes through, which applies grants and excludes trashed rows, and the lint rule that forbids bypassing it, land here; they replace the per-query `isDeletedOn: null` that the inventory found missing in places.
3. **Assignments as references.** A new `assignments` table `{ assignmentId, contentId, cid, revisionNum, followLatest, courseId, classCode, settings… }`; each existing assignment root becomes a row pointing at itself at its current revision (so nothing students see changes), and `contentState`, `contentItemState`, `assignmentScores` and `submittedResponses` key by `assignmentId` with `cid` recorded per attempt. New assignments make no copy. The `isAssignmentRoot` and `courseRootId` flags go with the contract step.
4. **Library submissions as references.** `libraryActivityInfos` becomes `submissions` `{ submissionId, contentId, cid, status, reviewerId }`. Existing published library copies stay as content, owned by the legacy library account, each with a submission pinned at its own revision, so nothing published disappears; new submissions reference the author's item. Library folders are retired once their contents are reachable through search by category.
5. **Remix provenance only.** `contributorHistory` keeps the origin, the `cid` taken and the license; the subscribe flags and the sync code go. The comparison page is retired.
6. **Problem sets assembled by the viewer.** `GET …/source` on a problem set returns the tree with each document's source; the viewer builds the activity. Revisions of a problem set hash the tree. Question banks are converted to problem sets (their documents in order; `numToSelect` and `selectByVariant` dropped) and the `select` type is retired.
7. **Live editing and automatic revisions.** A websocket service (Hocuspocus or `y-websocket`) beside the stateless API, with one persisted CRDT document per content item, seeded from the current source. `contentRevisions` becomes `{ contentId, revisionNum, cid, createdAt, name?, note? }` plus a revision-authors table, with text moved into a content-addressed table keyed by `cid` (existing rows already carry a `cid`). The materialiser records revisions on the cadence the design states; `saveDoenetML` and the editor's autosave become a transaction on the CRDT until the editor speaks the websocket itself. This is the one step that adds infrastructure (a stateful service and its persistence) and needs an `## Infra Updates Before Merge` section.

## How the move is made

The old routes and the new operations coexist under `/api` (legacy) and `/api/v1` (new) until the last stale client is gone. Nothing is renamed in place; every old route is replaced by a new operation, every caller is moved, and the old route is deleted later. That is the expand-migrate-contract cycle of ADR 0003 applied about a hundred times, so the mechanics have to be cheap and the same each time.

### The lifecycle of one route

Each migrated route goes through four states, usually across three PRs:

1. **Expand.** Define the new endpoint with `defineOperation` in `src/schemas/<resource>Contract.ts` (method, path, request schema, response schema, `audience`, `include` list), implement it with `implement`, add it to `apiOperations`, run `contract:generate`. The handler is usually the existing query function, trimmed: the bundled handler keeps serving the old route from the same function until the old route goes. Unit-test the new endpoint's permissions; the authorization gaps above are fixed here, each named in the PR.
2. **Migrate.** Move every caller: the page loader or component in `apps/app` to `request("GET /…", params)` or `submit(fetcher, "POST /…", params)`, and the e2e tests to `cy.apiRequest`. Delete the file from `eslint-suppressions.json` (it may only shrink). The `untypedCallers` test fails if a raw `axios`, `fetch`, `cy.request` or `genericAction` `path:` call still names a covered endpoint's path, so a missed caller fails CI. Same PR as the expand, since the frontend deploys after the backend (ADR 0003).
3. **Wait.** The old route still serves stale clients. Nothing to do.
4. **Contract.** Once the request log shows no build calling the old route (`infra/README.md`, "Removing an API shape"), delete the route, its schema and its entry in `contract-uncovered.json`; the coverage test fails if the entry outlives the route. One PR can retire several routes.

Mutations are migrated the same way; they are simpler because a mutation's caller is one component and its revalidation is handled by `genericAction`.

### Machinery first

Three PRs before any page moves, each small, after the data-model changes above:

- **Contract extensions.** `HttpMethod` gains `patch`, `put` and `delete`; `OperationContract` loses `name` and is keyed by method and path (the OpenAPI `operationId` is derived by the generator); it gains `audience` and `includes`; `implement` parses `include=` against the list and `limit`/`cursor` for collections; the OpenAPI generator emits the public document and the full one; `operationsRouter` mounts under `/api/v1` as well as `/api` (the legacy prefix only for `getAssigned`, which keeps its URL until retired). Reference-data responses get `ETag` and `Cache-Control`. On the client side, `request`, `submit` and `cy.apiRequest` take route strings typed from `paths`, `operations.ts` is no longer generated, and the `untypedCallers` test scans raw call sites instead of all strings.
- **Session cache.** As in the design, with its effect shown in the `Server-Timing` query count before and after on the dev environment.
- **Perf proxies.** `apiRequests` and `apiDepth` per perf scenario in the harness of #3059, plus the ESLint rule for loaders. Baseline snapshots are taken from the current pages before the first page migrates. Without the harness, "no slower" cannot be shown per PR, so this is a prerequisite. ADR 0003's breaking-change gate (`oasdiff` in `.github/workflows/deploy-safety.yml`, overridden by the `api-breaking` label) already exists and is what the contract phase relies on.

### Order of the resource work

Ordered by what each step retires and what it unblocks. Sizes are rough PR counts for the expand-plus-migrate step; contract PRs come later and are small.

| Step | Scope                                                                                                                                                                       | Retires | PRs | Why here                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Reference data, `GET /users/me`, `PATCH /users/me`; root loader to one call; `shouldRevalidate`                                                                             | 9       | 2   | Touches every page's request count; proves `ETag` caching and the route-string client in the root loader.                              |
| 2    | `GET /content/{id}` with includes, `PATCH /content/{id}`, `POST /users/me/recent`; editor header, settings, compound tabs, viewer, breadcrumbs, image details, assign modal | 12      | 3–4 | Retires the most screen-shaped routes; proves `include` on the heaviest resource.                                                      |
| 3    | `GET /content/{folderId}/children` with `root` and author root folders, trash, shared-with-me, move/copy dialog, add-to menu; `POST /content`, the bulk commands            | 16      | 3   | Lists stop shipping DoenetML; create-then-rename becomes one mutation; the app stops assuming a folder's listing is keyed by its user. |
| 4    | Source and revisions, audit, grants, categories, classifications, remix provenance                                                                                          | 19      | 3   | Mostly one-to-one renames behind the editor tabs; the sync and comparison routes are retired without replacement.                      |
| 5    | Assignments: the `Assignment` resource over the new table, scores, attempts bound to a `cid`, responses, roster, gradebook, class codes, the viewer                         | 20      | 4   | The viewer is the riskiest page (students mid-attempt); it goes last within the step, behind a route flag.                             |
| 6    | Library submissions, search with `curated=`, explore, images, auth renames                                                                                                  | 22      | 3   | Independent of the rest; can run in parallel with step 5.                                                                              |

Each step's first PR takes the baseline snapshots for the pages it touches; each page PR shows `apiDepth` 1 and the query-count delta, with any rise explained in the PR's Approach section. A PR that moves a page also moves that page's e2e tests to `cy.apiRequest`.

### Request counts, before and after

Today's critical-path requests against the parallel requests under the design, per page. Every chain becomes a fan-out; the count falls where the root loader and the editor dominate, and rises on the pages that today get one bundle. Those rises are parallel requests on one connection, not round trips.

| Page                         | Today → new                 |
| ---------------------------- | --------------------------- |
| Root layout                  | 3 → 1                       |
| My content, library folder   | 1 → 1                       |
| An author's content          | 2 → 2                       |
| Curation queue               | 1 → 1                       |
| Explore                      | 2 → 2–5                     |
| Activity viewer              | 1 → 1                       |
| Editor layout                | 2 → 1                       |
| Editor: settings             | 3 → 1                       |
| Editor: history              | 1 → 2                       |
| Editor: remixes, library     | 2 → 2                       |
| Assign modal                 | 3 → 1                       |
| Student enters a code        | 3–4 → 3 (+1 once at entry)  |
| Assignment overview          | 1 → 2                       |
| Assignment, one student      | 1 → 4–5                     |
| Student scores               | 1 → 2                       |
| Scratch pad with `contentId` | 2 (+redirect) → 1           |
| Add-to menu                  | 4 at depth 2 → 4 at depth 1 |
| Everything else              | unchanged                   |

**Database queries.** Down where the reference lists and the per-request auth queries go; flat where a bundled handler's queries move into separate handlers; up by a few indexed lookups on the one-student assignment page, where each sub-resource read verifies the assignment that one handler verified once. That rise is accepted explicitly in the snapshot of the PR that migrates the page; if it matters, `include=myScore,myAttempts` on `GET /assignments/{id}` folds the student's own sub-resources back into one request without reintroducing a screen shape.

### What stays the same during the migration

- A page is migrated whole: its loader and all its mutations in one PR, so a page never mixes old and new reads of the same resource.
- Query functions are not rewritten for their own sake. A new operation's handler calls the existing function, with the bundling removed; refactors of `query/*.ts` are separate PRs.
- The database changes only in the data-model steps above, each its own expand-migrate-contract cycle; the resource work that follows reads the tables as they are after them. `editor` grants to users are not yet issued, `authors` is the owner, and the wire type names map onto the existing enum.
- The old URLs keep their behaviour until deleted, including their quirks (`notMe`, bare arrays), because stale clients expect them.

### Risks

- **The assignment viewer.** A student with a tab open across the deploy keeps calling `saveScoreAndState` on the old route; that route stays until the log is clean, which for a semester-long course can be weeks. The contract step for score and attempt routes waits accordingly.
- **Two URL spaces for months.** Public documentation is generated from the public OpenAPI document only, so `/api/v1` is all an outside reader sees; the legacy routes are in the full document until they go.
- **The websocket service is stateful.** It holds the live documents, so its deploys, scaling and persistence are a different problem from the API's rolling tasks; a document must survive the service restarting (persist updates, not just snapshots) and two instances must never serve the same document.
- **The ratchets only shrink.** `contract-uncovered.json` and `eslint-suppressions.json` are what keep the migration from stalling halfway: a review that lets either grow reopens the gap this design closes.
