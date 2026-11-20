# Doenet API design

Status: proposal. The questions still open are collected in [Open decisions](#open-decisions); the rest is written as if the recommended answer were chosen. How the current code moves to this design, and which current route each endpoint replaces, is in [API_MIGRATION.md](./API_MIGRATION.md).

The API is one surface that the Doenet app uses in full and that can be published as-is. It has to meet three criteria:

1. **Dogfooded.** The app calls the public API. The private surface is the sign-in flows, the test routes and the health check, nothing else.
2. **Resource-centred.** An endpoint reads or changes one resource or one collection. What a page needs is composed in the app from those endpoints, not pre-mixed on the server.
3. **No slower.** A page load is one round trip to the API. Each page's database queries are the minimum its data needs; they are measured per perf scenario (`docs/adr/0002`) and expected to fall, since the current queries were never designed as a set.

Terms (covered operation, breaking change, stale client, perf scenario, query count snapshot) are those of `CONTEXT.md`. All paths below are under `/api/v1`.

## Principles

### P1. Public by default

Every endpoint declares an `audience`: `public` or `internal`. Internal is only the sign-in flows (`/auth/*`), the Discourse SSO callback, `/health`, `/test/*` and `/metrics/*`. Everything else is public, including endpoints gated by a role or a flag (curation needs `isEditor`, rosters need course ownership, image upload needs `canUploadImages`), the same way an admin endpoint is public but gated. The public OpenAPI document contains only public endpoints; a test fails if the app calls an internal one outside the sign-in files.

### P2. Resources, not screens

- An endpoint returns one resource, one collection, or the result of one command on one resource.
- Related data is attached with `include=`, from a fixed list per resource, never by default. An include is a direct relation of bounded size (a parent, an owner, a list of grants); a collection that needs paging is a sub-resource with its own endpoint, never an include. Each include is resolved with one query for the whole response, not one per item.
- A list returns the summary form of its items (no DoenetML source, no children). The full form is one read away, or an `include`.
- Reference data (licenses, DoenetML versions, categories, classification systems) is its own cacheable collection, never embedded in another response.
- Reads have no side effects. Recording a recent edit or a view is an explicit write the app fires without awaiting.
- The server does not tell the client where to go. A read of something you may not read is `404`; a write you may not make is `403`; every content read carries `permissions` so the app decides what to show.
- Reads are `GET`; replacing a sub-resource is `PUT`; a partial update is `PATCH`; a state transition with side effects (publish, move, restore) is a `POST` command under the resource. `DELETE` moves to the trash.

### P3. One round trip per page

- All the API requests a page needs are issued at once. The only second hop is an auth redirect (a guest entering a class code gets an anonymous account first).
- A page URL carries every id its loader needs, or the API accepts an alias for it: `me` (the signed-in user) and `root` (the caller's root folder). A loader never calls the API to learn an id it then uses in another call. Aliases are resolved in one middleware before any handler or permission filter runs, and a response addressed by alias is private to the caller, so it never carries a cacheable `Cache-Control`.
- Parallel requests cost the server nothing beyond their own data queries: the session user is cached (see [Session caching](#session-caching)).
- Two perf proxies, snapshotted per perf scenario: `apiRequests` and `apiDepth` (the longest chain of requests where one starts after another ends). `apiDepth` is 1 for every page-load scenario and is the hard rule. Database queries per scenario are snapshotted too, and every change is reviewed, but the target is the minimum the page needs, not parity with any earlier number. An ESLint rule forbids a loader from `await`ing one API call after another outside `Promise.all`.

### P4. One mechanism each

The model below assumes six choices that each replace a special case with something that already exists:

- **Access is grants.** Public and unlisted are grants to `anyone`, inherited down the tree like a grant to a person. There is no visibility field and no cascade code.
- **A group folder is a shared folder.** Any folder granted to others at `editor` is a group folder. Ownership follows the folder; authorship is a list of people.
- **An assignment references a revision.** Nothing is copied. Students work against the pinned revision; the instructor moves the pin.
- **A library submission references a revision.** Nothing is copied and curators do not edit. "In the library" is a search filter.
- **A remix is provenance.** A copy records what it came from and at which revision. There is no syncing between copies.
- **Trash is a flag, hidden by one filter.** A trashed item stays where it was, marked; restoring clears the mark. One access filter, which every content read goes through, hides it everywhere.

And three smaller ones: documents are edited live through a CRDT, with revisions materialised from it automatically; the viewer assembles a problem set from its documents, so the server never compiles; and the question bank type is retired.

## Model

```
content/{contentId|root}            document, problem set, folder, image
  /children                         folder listing (paginated); problem-set structure via include=children
  /source, /revisions, /audit
  /grants, /grants/{granteeId}      sharing, public access
  /categories, /classifications/{classificationId}
  /remix-sources, /remixes          provenance
  /assignments                      assignments of this content
  /submission                       its library submission, if any
  /students, /gradebook             course roster and gradebook (course folders)
  /views                            popularity (write only)
content/move, /copies, /trash, /restore   bulk commands
assignments/{assignmentId}
  /source                           the pinned revision, for students
  /scores/{userId|me}, /attempts/{userId|me}/{attemptNumber}, /responses, /responses/counts
codes/{classCode}
users/{userId|me}
  /trash, /shared-with-me, /recent, /assignments, /scores
library/submissions/{submissionId}  curation queue, with /comments
search/content, search/authors, explore/trending, explore/recent
licenses, doenetml-versions, categories, classification-systems, classifications
images/uploads, images
auth/*                              internal
```

### Content

The content tree holds four types, named on the wire as `document`, `problemSet`, `folder` and `image`. A problem set contains documents; a folder contains anything. Every account has a root folder, an ordinary folder row; `GET /users/{userId}` gives its id, and `root` is accepted wherever a folder id is, for the caller's own root.

A `Content` has `contentId`, `type`, `name`, `ownerId` (the account whose tree it is in, inherited from the parent on create and on move), `parentId`, `licenseCode`, `createdAt`, `lastEdited`, `publicAccess` (`none`, `unlisted` or `public`, derived from the effective `anyone` grant), the settings of its type (`numVariants` and `doenetmlVersion` for a document; `shuffle` and `paginate` for a problem set; `repeatInProblemSet` for a document inside one; attribution fields for an image), and `permissions: { canView, canEdit, canShare, canAssign, canDelete, isOwner }` for the caller. The DoenetML source and the children are never in the base form.

Includes: `children` (the problem-set structure, never into folders), `parent`, `ancestors` (the chain up to the root, for breadcrumbs), `owner`, `authors`, `grants`, `categories`, `classifications`, `assignments`, `submission`, `source`.

| Endpoint                                                            | Auth     | What it does                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /content/{contentId}?include=`                                 | optional | One content item, if the caller has a grant on it or an ancestor (including `anyone`), or owns it. `404` otherwise, and for anything in the trash.                                                                                                                                                                                             |
| `GET /content/{folderId}/children?q=&type=&limit=&cursor=&include=` | optional | The items directly in a folder, in order, in summary form; `q` searches names and sources under the folder; `type` filters. Returns what the caller may see of the folder. `include=parent,ancestors` describes the folder itself; `grants,assignments,submission` add each item's grants, assignments and library status for an owner's view. |
| `POST /content`                                                     | required | `{ type, name?, parentId, source?, authors?, childrenCopiedFrom? }`. Creates an item in a folder the caller can edit; the item is held by the folder's owner. `childrenCopiedFrom` makes a problem set whose children are copies of the given ids. Returns the `Content`.                                                                      |
| `PATCH /content/{contentId}`                                        | required | Changes any settable scalar: `name`, `licenseCode`, `doenetmlVersionId`, `authors`, the type's settings, an image's attribution. A field the type doesn't have is `400`. Returns the `Content`.                                                                                                                                                |
| `DELETE /content/{contentId}`                                       | required | Moves the item and its subtree to the trash. Sugar for `POST /content/trash` with one id.                                                                                                                                                                                                                                                      |
| `POST /content/move`                                                | required | `{ contentIds, parentId, position? }`. Moves the items under a folder the caller can edit, in order, at `position`. Refused with `409` when the destination is in a tree with a different owner, because that would transfer ownership; copy instead. Atomic.                                                                                  |
| `POST /content/copies`                                              | required | `{ contentIds, parentId, prependCopy? }` → `{ contentIds }`. Copies items the caller can view into a folder they can edit, recording the remix provenance. Atomic.                                                                                                                                                                             |
| `POST /content/trash`                                               | required | `{ contentIds }`. Marks the items and their subtrees as trashed; they stay where they are. Atomic.                                                                                                                                                                                                                                             |
| `POST /content/restore`                                             | required | `{ contentIds }`. Clears the mark, so the items reappear where they were; an item whose parent is itself trashed is restored to the root. Atomic.                                                                                                                                                                                              |

**Trash never leaks.** A trashed item keeps its `parentId`; the trash command stamps `trashedAt` on every row of the subtree and `trashRootId` on each, and restore clears both. Every content read in the server goes through one access filter, which applies the caller's grants and excludes anything with `trashedAt` set; the lint rule that already forbids hand-rolled `isEditor` flags extends to forbid a content query that bypasses the filter. The places that would otherwise show trashed items are the ones that reach content without walking the tree: search and explore, `shared-with-me`, `recent`, remix lists, the curation queue, an assignment's or submission's content, and the gradebook. Each is a query through the filter, so none needs its own check. `GET /users/me/trash` is the one read that asks the filter for trashed items, and it lists the trash roots only.

#### Source, live editing and revisions

A document's source is DoenetML. A problem set's source is its structure with each document's source in place; the viewer assembles the activity from it, so the server never compiles.

Documents are edited live. The editable state of a document is a CRDT document (Yjs) that collaborators sync over a websocket; the problem-set structure (child order, settings) stays in the database behind the REST mutations. The CRDT is never what anything pins. On a schedule the server materialises the document to DoenetML, hashes it to a `cid`, and records a **revision**: `{ contentId, revisionNum, cid, createdAt, authors, name?, note? }`, with the text stored once per `cid`. Pins (assignments, submissions, remix provenance, attempts) reference revisions, so they never see the CRDT.

**Revisions are automatic; names are optional.** A revision is recorded when a document goes idle for a few minutes, when its last editor disconnects, at most every few minutes during continuous editing, and whenever something pins it. Naming attaches a name to the current state, materialising first if the latest revision is not identical. Unnamed revisions are thinned over time (all kept for a day, then one an hour, then one a day); named revisions and any revision something references are never thinned, and thinning removes revision rows only, never a `cid`'s text. Each revision records who contributed since the previous one, from the websocket's knowledge of which user each CRDT client is; that is where `authors` comes from.

**Restores and non-collaborative writes go through the CRDT.** Restoring a revision, `PUT …/source` and `…/source/upgrades` are applied as a transaction that replaces the document's content, which live collaborators see as an edit and which records a revision. Nothing rewinds the CRDT's own history under collaborators.

| Endpoint                                                                  | What it does                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WS /content/{contentId}/collab`                                          | The live document. Requires `editor`; a `viewer` may connect read-only to follow edits. Authenticated like every other endpoint. Not describable in OpenAPI; documented here and in the AsyncAPI document the contract also generates.                                           |
| `GET /content/{contentId}/source?revision=`                               | `{ source, doenetmlVersion, numVariants, revisionNum, cid, materializedAt }` for a document; `{ children: [...] }` with the same per document for a problem set, in order. The latest materialised state, which may lag the live document by the idle interval, or a revision's. |
| `GET /content/by-cid/{cid}/source`                                        | The source of a revision by its `cid`, for embeds, when that revision is public, published in the library, or assigned to the caller.                                                                                                                                            |
| `PUT /content/{contentId}/source`                                         | `{ source, numVariants, doenetmlVersionId?, ifRevision }`. The non-collaborative write (API clients, imports): replaces the document's content through the CRDT and records a revision; `409` if `ifRevision` is not the latest revision. Resets the audit.                      |
| `POST /content/{contentId}/source/upgrades`                               | `{ source, doenetmlVersionId }`. Saves a source converted to a newer DoenetML version, recording a revision before and after.                                                                                                                                                    |
| `GET /content/{contentId}/revisions?named=&include=source&limit=&cursor=` | The item's revisions, newest first, each with its `authors`; `named=true` lists only named ones.                                                                                                                                                                                 |
| `POST /content/{contentId}/revisions`                                     | `{ name, note? }` → `{ revisionNum, cid }`. Names the current state, materialising first if needed. Assigning, submitting to the library and copying record an unnamed revision the same way.                                                                                    |
| `PATCH /content/{contentId}/revisions/{revisionNum}`                      | `{ name, note }`. Naming an automatic revision keeps it from being thinned.                                                                                                                                                                                                      |
| `POST /content/{contentId}/revisions/{revisionNum}/restore`               | Replaces the document's content with the revision's, through the CRDT, recording a revision of what it replaced.                                                                                                                                                                 |
| `PUT /content/{contentId}/audit`                                          | `{ cid, errorsCheckPasses, accessibilityCheckPasses }`. Records the client's diagnostics for a materialised revision. Granting `anyone` access requires a passing audit of the latest revision.                                                                                  |

#### Grants

Access is a list of grants. A grant is `{ grantee, role, inherited }`, where `grantee` is `{ kind: "user", userId }` or `{ kind: "anyone", listed }` and `role` is `viewer` or `editor`. A grant on a folder applies to everything under it and shows as `inherited` there. The `anyone` grant is what "public" means: `listed: true` is public and searchable, `listed: false` is unlisted. Only the owner grants; an `editor` edits and creates but does not share. A folder granted to others at `editor` is a group folder, and what its editors create is held by the folder's owner like everything else in that tree. Only `viewer` grants to users are issued today; `editor` is a new allowed value, not a new shape.

`authors` is the list of people credited for the content, separate from the account that holds it; today it is the owner.

| Endpoint                                                         | What it does                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /content/{contentId}/grants`                                | `{ grants, inherited, publicGrantBlockers }`: the item's own grants, those it inherits, and what would stop an `anyone` grant (missing required categories or a failing audit, on the item or any descendant). |
| `PUT /content/{contentId}/grants/anyone`                         | `{ role: "viewer", listed }`. Makes the item and its subtree unlisted or public. Refused with `409`, naming the blockers, while any exist. Owner only.                                                         |
| `DELETE /content/{contentId}/grants/anyone`                      | Makes the item private again, unless an ancestor's `anyone` grant still covers it (`409` with the ancestor).                                                                                                   |
| `POST /content/{contentId}/grants`                               | `{ email \| userId, role }` → the grant. Owner only.                                                                                                                                                           |
| `DELETE /content/{contentId}/grants/{userId}`                    | Removes a direct grant. Owner only.                                                                                                                                                                            |
| `PUT /content/{contentId}/categories`                            | `{ codes }`. Replaces the item's categories (subject, level and so on).                                                                                                                                        |
| `POST /content/{contentId}/classifications`                      | `{ classificationId }`. Adds a standards classification.                                                                                                                                                       |
| `DELETE /content/{contentId}/classifications/{classificationId}` | Removes one.                                                                                                                                                                                                   |

A child cannot be more private than its ancestors, because access is inherited; it can be more open, by its own grant. Those two sentences are the whole visibility rule.

#### Remixes

Copying records provenance: the copy remembers its origin, the revision (`cid`) it took, and the license it was taken under. That is enough for attribution and for telling an author that an origin has moved on. There is no syncing: someone who wants the newer version copies again.

| Endpoint                                 | What it does                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /content/{contentId}/remix-sources` | What this item was copied from, each with the `cid` taken and whether the origin's current `cid` differs. |
| `GET /content/{contentId}/remixes`       | What has been copied from this item.                                                                      |

#### Courses

A course is a folder whose students are rostered to it. Until courses become their own resource these live on the folder.

| Endpoint                            | Auth     | What it does                                                                                           |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `GET /content/{folderId}/students`  | required | The roster; owner only.                                                                                |
| `POST /content/{folderId}/students` | required | `{ count }` → the accounts made, with handles and one-time passwords.                                  |
| `GET /content/{folderId}/gradebook` | required | `{ students, assignments, scores }`: every rostered student's score on every assignment in the folder. |

### Assignments

An assignment is a reference to a revision of a content item, plus the terms students work under. Nothing is copied: the author keeps editing the item, and the assignment says which revision students get.

An `Assignment` is `{ assignmentId, contentId, courseId, revisionNum, cid, followLatest, classCode, openOn, closedOn, status, mode, maxAttempts, individualizeByStudent, hasScoreData, ownerId, permissions }`. `courseId` is the folder whose gradebook it appears in. `status` is `open` or `closed` from `closedOn`; `mode` is `formative` or `summative`. Owner-only fields are omitted for students. Includes: `content` (name, type and owner of the referenced item), `owner`.

**Attempts are bound to a revision.** DoenetML cannot carry a student's saved state from one version of a document to another, so each attempt records the `cid` it started on and keeps it until the student starts a new attempt. The assignment's pin decides the `cid` for new attempts. The instructor moves the pin explicitly (`PATCH` with `revisionNum`) or sets `followLatest`, in which case every materialised revision moves it (at each idle point, not each keystroke). Either way a live edit reaches every student who starts a new attempt and never disturbs one in progress; the viewer loads an attempt's own revision, so an old attempt stays readable after the pin has moved.

| Endpoint                                                                                           | Auth     | What it does                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /assignments`                                                                                | required | `{ contentId, courseId, closedOn, revisionNum?, followLatest? }` → `Assignment`. Records a revision of the item if `revisionNum` is omitted, and issues a class code.                                                 |
| `GET /assignments/{assignmentId}?include=content`                                                  | required | The assignment, for its owner or a student who has it.                                                                                                                                                                |
| `PATCH /assignments/{assignmentId}`                                                                | required | `{ revisionNum?, followLatest?, closedOn?, maxAttempts?, mode?, individualizeByStudent? }`. Owner only. Moving the pin affects new attempts only.                                                                     |
| `GET /assignments/{assignmentId}/source?cid=`                                                      | required | The pinned revision's source (a document's DoenetML or a problem set's tree), or the revision an attempt was started on when `cid` is given. This is how students read content they have no grant on.                 |
| `GET /content/{contentId}/assignments`                                                             | required | The assignments of a content item; owner only.                                                                                                                                                                        |
| `GET /codes/{classCode}`                                                                           | optional | `{ assignmentId, contentId, name }`. Resolves a class code, which is how students arrive. Codes are small integers, so this endpoint is rate-limited per client and returns nothing beyond what the entry flow needs. |
| `GET /assignments/{assignmentId}/scores?include=items&limit=&cursor=`                              | required | Every student's score, with per-item scores on request. Owner only.                                                                                                                                                   |
| `GET /assignments/{assignmentId}/scores/{userId\|me}`                                              | required | One student's score: best attempt, latest attempt, per-item scores.                                                                                                                                                   |
| `GET /assignments/{assignmentId}/attempts/{userId\|me}`                                            | required | The student's attempts, each with its score and `cid`.                                                                                                                                                                |
| `GET /assignments/{assignmentId}/attempts/{userId\|me}/{attemptNumber\|latest}?item=&itemAttempt=` | required | One attempt's state, score, variant and `cid`, with its item states; `item` and `itemAttempt` select one item attempt.                                                                                                |
| `POST /assignments/{assignmentId}/attempts`                                                        | required | Starts a new attempt for the caller on the pinned revision, if `maxAttempts` allows.                                                                                                                                  |
| `PUT /assignments/{assignmentId}/attempts/me/{attemptNumber}/state`                                | required | `{ state, score, variant, item? }`. Saves the viewer's state and score; returns the recomputed score.                                                                                                                 |
| `POST /assignments/{assignmentId}/responses`                                                       | required | Records one submitted answer with its credit.                                                                                                                                                                         |
| `GET /assignments/{assignmentId}/responses?userId=&answerId=&attempt=&item=&itemAttempt=`          | required | A student's submitted answers to one question; self, or owner for any student.                                                                                                                                        |
| `GET /assignments/{assignmentId}/responses/counts?userId=&attempt=&item=`                          | required | How many responses each answer received, for the owner's review view.                                                                                                                                                 |
| `GET /users/me/assignments?include=content`                                                        | required | What the caller has been assigned.                                                                                                                                                                                    |
| `GET /users/{userId\|me}/scores?course=`                                                           | required | `{ items: [{ assignmentId, name, score }] }` across assignments, optionally in one course; self, or the course's owner.                                                                                               |

### Library (curation)

A submission is a reference to a revision of a public content item that its owner proposes for the library, with a status (`pending`, `underReview`, `published`, `rejected`), a reviewer and the comments between them. Nothing is copied and reviewers do not edit: if the author wants a change considered, they submit again, which pins the new revision and returns the submission to review. A published submission is what "in the library" means; the library is `GET /search/content?curated=true`, organised by categories and classifications like everything else.

| Endpoint                                                          | Auth     | What it does                                                                                                                                                    |
| ----------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /library/submissions`                                       | required | `{ contentId }` → the submission. The item must be public; its current revision is pinned. Resubmitting an item moves its existing submission's pin and status. |
| `GET /library/submissions?status=&limit=&cursor=&include=content` | editor   | The queue. `status` takes several values; each item carries its own.                                                                                            |
| `GET /content/{contentId}/submission`                             | optional | The item's submission, if any, with its pinned revision and status.                                                                                             |
| `POST /library/submissions/{submissionId}/claim`                  | editor   | Takes the review.                                                                                                                                               |
| `POST /library/submissions/{submissionId}/publish`                | editor   | The reviewer only. The pinned revision stays readable while published, even if the author later makes the item private.                                         |
| `POST /library/submissions/{submissionId}/unpublish`              | editor   |                                                                                                                                                                 |
| `POST /library/submissions/{submissionId}/reject`                 | editor   |                                                                                                                                                                 |
| `GET /library/submissions/{submissionId}/comments`                | required | The submitter or an editor.                                                                                                                                     |
| `POST /library/submissions/{submissionId}/comments`               | required | `{ comment }`; whether it is an editor's comment follows from the caller.                                                                                       |

### Users

| Endpoint                             | Auth     | What it does                                                                                                                                        |
| ------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /users/{userId\|me}`            | optional | `me`: the full profile with `rootFolderId`, `isEditor`, `isAuthor`, `canUploadImages`, `theme`; `401` for a guest. Others: name and `rootFolderId`. |
| `PATCH /users/me`                    | required | `{ firstNames?, lastNames?, isAuthor?, theme? }`.                                                                                                   |
| `GET /users/me/trash`                | required | `{ items: [{ content, trashedAt }] }`: the subtrees the caller has trashed, by their roots; the one listing that includes trashed items.            |
| `GET /users/me/shared-with-me?role=` | required | The folders and items others have granted the caller; with `role=editor`, the group folders the caller can work in.                                 |
| `GET /users/me/recent?mode=&types=`  | required | Recently edited or viewed items.                                                                                                                    |
| `POST /users/me/recent`              | required | `{ contentId, mode }`. Records one.                                                                                                                 |
| `POST /content/{contentId}/views`    | optional | Records a view, for popularity. Counted at most once per viewer per day.                                                                            |

An author's public content is their root folder's listing: `GET /content/{rootFolderId}/children` returns what the caller may see of it.

### Reference data

`GET /licenses`, `GET /doenetml-versions` (the default flagged), `GET /categories` (groups with their categories), `GET /classification-systems` (the full tree), `GET /classifications?q=&systemId=&categoryId=&subCategoryId=&limit=`. Optional auth, `ETag` and `Cache-Control: max-age=3600`. The app fetches each once per session.

### Search and explore

| Endpoint                                                                                                                          | What it does                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /search/content?q=&curated=&systemId=&categoryId=&subCategoryId=&classificationId=&unclassified=&category=&ownerId=&facets=` | `{ items, totalCount, facets?: { categories, classifications, authors } }`: listed public content matching the text and filters, with the counts behind each facet on request. `curated=true` is the library. |
| `GET /search/authors?q=&…filters`                                                                                                 | Authors with public content, matched by name, with their counts.                                                                                                                                              |
| `GET /explore/trending?…filters`                                                                                                  | Listed public content by recent views.                                                                                                                                                                        |
| `GET /explore/recent?…filters`                                                                                                    | Listed public content by when it was made public.                                                                                                                                                             |

`category=` repeats for several codes; the server validates them.

### Images

| Endpoint               | What it does                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `POST /images/uploads` | `{ mimeType, sizeBytes }` → a presigned PUT and an upload key. Requires `canUploadImages`.          |
| `POST /images`         | `{ uploadKey, parentId, name?, attribution… }` → the image `Content`, once the upload has been PUT. |

An image is content: `GET /content/{contentId}` reads it, `PATCH` changes its attribution.

### Auth (internal)

`POST /auth/magic-link`, `GET /auth/magic-link/confirm?token=`, `POST /auth/handle`, `POST /auth/anonymous` (returns the user it made), `GET /auth/google`, `POST /auth/logout`, `GET /auth/discourse/sso`. All `audience: internal`; the two OAuth-style callbacks are `external` in the contract's sense.

## Conventions

- Prefix `/api/v1`. The method and path are the identity of an endpoint, for the public and for our own callers; they are fixed from the first public release and evolve additively under expand-migrate-contract. The contract is keyed by them too; the OpenAPI `operationId` that documentation and SDK generators want is derived from them by the generator and is not something a caller says.
- Ids are short UUIDs. The same id is always called the same thing: `contentId`, `folderId` (a content id known to be a folder), `courseId` (a folder with a roster), `assignmentId`, `userId`, `submissionId`, `revisionNum`, `attemptNumber`. The app brands `AssignmentId` and `ContentId` as distinct types.
- Timestamps are ISO 8601 with offset.
- Every collection takes `limit` and `cursor` and returns `{ items, nextCursor }`. The default `limit` is 500, the maximum 1000. A caller that does not page must treat an unexpected `nextCursor` as an error rather than silently show a partial list.
- `include` values are validated against the endpoint's list; an unknown value is `400`.
- Bulk commands are atomic: all ids succeed or none do, and the response lists the outcome per id. A command takes at most 100 ids; grant inheritance means a move changes what a subtree's readers can see, which is why the bound exists.
- Responses are always objects; mutations return the resource or the ids they touched.
- Errors use one body, `{ error, details? }`: `400` invalid input, `401` guest where a user is required, `403` permitted to read but not to do this, `404` not found or not viewable, `409` stale `ifRevision`, a blocked `anyone` grant, or a move across trees.

### Calling the API

The app and the e2e tests call an endpoint by its route string, the method and path template in one literal, typed from the `paths` interface that `openapi-typescript` generates from the contract:

```ts
const { content } = await request("GET /content/{contentId}", {
  contentId,
  include: ["children", "ancestors"],
});
submit(fetcher, "PATCH /content/{contentId}", { contentId, name });
cy.apiRequest("GET /users/me");
```

A template-literal type over `paths` checks the string: a path not in the contract, a method the path doesn't have, a missing path parameter or a wrong body is a compile error, and the response type is the contract's. Path parameters are substituted from the params object; for `GET` the rest are the query, otherwise the JSON body. Removing an endpoint removes its key, so every caller fails to compile; changing a path is a removal plus an addition, which is what it is to a stale client. GitHub's SDK (`request("GET /repos/{owner}/{repo}", …)`) is the precedent, and the name.

### Session caching

Every request resolves the session user before its handler runs. That user, including `isEditor`, is cached in process for a short TTL keyed by session id, cleared on logout and on `PATCH /users/me` in the same process. A page's parallel requests then cost the server only their own data queries, which is what lets resource endpoints replace bundled ones. The perf middleware's per-request query count shows the effect.

## How the app composes a page

Each loader issues all its requests at once. Reference data is in memory after first use.

| Page                    | Requests, all in parallel                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root layout             | `GET /users/me`                                                                                                                                                                                                   |
| A folder                | `GET /content/{folderId\|root}/children?include=parent,ancestors,grants,assignments,submission`                                                                                                                   |
| An author's content     | `GET /content/{rootFolderId}/children?include=parent,owner`                                                                                                                                                       |
| Library                 | `GET /search/content?curated=true&facets=categories`                                                                                                                                                              |
| Curation queue          | `GET /library/submissions?status=pending,underReview,rejected,published&include=content`                                                                                                                          |
| Explore                 | `GET /search/content?facets=…` or `GET /explore/trending` + `GET /explore/recent` + `GET /search/content?curated=true`; `GET /search/authors`; `GET /users/{ownerId}` when filtering by author                    |
| Activity viewer         | `GET /content/{id}?include=children,owner,authors,classifications,submission`, `GET /content/{id}/source`, `GET /content/{id}/remix-sources`; `POST /content/{id}/views`                                          |
| Editor layout           | `GET /content/{id}?include=ancestors,assignments,submission`; `POST /users/me/recent`                                                                                                                             |
| Editor: edit / view     | `GET /content/{id}/source`, then `WS /content/{id}/collab` for the live document                                                                                                                                  |
| Editor: settings        | `GET /content/{id}?include=categories,classifications`, `GET /content/{id}/remix-sources`                                                                                                                         |
| Editor: history         | `GET /content/{id}/revisions`, `GET /content/{id}/source`                                                                                                                                                         |
| Editor: remixes         | `GET /content/{id}/remix-sources`, `GET /content/{id}/remixes`                                                                                                                                                    |
| Editor: library         | `GET /content/{id}/submission`, `GET /library/submissions/{submissionId}/comments`                                                                                                                                |
| Editor: problem set     | `GET /content/{id}?include=children` (structure) or `GET /content/{id}/source` (preview)                                                                                                                          |
| Share modal             | `GET /content/{id}/grants`                                                                                                                                                                                        |
| Assign modal            | `GET /content/{id}?include=assignments`, `GET /content/{id}/revisions?limit=5`                                                                                                                                    |
| Student enters a code   | `GET /codes/{classCode}`, then the assignment page                                                                                                                                                                |
| Assignment (student)    | `GET /assignments/{id}`, `GET /assignments/{id}/attempts/me/latest`, `GET /assignments/{id}/source?cid=…` once the attempt's `cid` is known, or `GET /assignments/{id}/source` for a first attempt (see below)    |
| Assignment overview     | `GET /assignments/{id}?include=content`, `GET /assignments/{id}/scores?include=items`                                                                                                                             |
| Assignment, one student | `GET /assignments/{id}?include=content`, `GET /assignments/{id}/scores/{userId}`, `GET …/attempts/{userId}` or `GET …/attempts/{userId}/{n}?item=` + `GET …/responses/counts`, `GET /content/{courseId}/students` |
| Answer drawer           | `GET /assignments/{id}/responses?…`                                                                                                                                                                               |
| Gradebook               | `GET /content/{courseId}/gradebook`                                                                                                                                                                               |
| Student scores          | `GET /users/{userId}/scores?course=`, `GET /users/{userId}`                                                                                                                                                       |
| Assigned                | `GET /users/me/assignments?include=content`                                                                                                                                                                       |
| Trash, shared with me   | `GET /users/me/trash` / `GET /users/me/shared-with-me`                                                                                                                                                            |
| Scratch pad             | `GET /content/{id}/source`                                                                                                                                                                                        |
| Embed                   | `GET /content/{id}/source` or `GET /content/by-cid/{cid}/source`                                                                                                                                                  |
| Add-to menu             | `GET /users/me/recent`, `GET /content/root/children?type=…&limit=1` per type                                                                                                                                      |
| Move/copy dialog        | `GET /content/{folderId}/children?include=parent,ancestors`; whether an item can be opened is `permissions` plus type                                                                                             |

The student assignment page is the one place where a loader would want a second hop: the source to load depends on the latest attempt's `cid`. It avoids it by requesting the pinned source and the latest attempt together; only when the attempt's `cid` differs from the pin (the pin moved after the attempt started) does it fetch that revision, which is rare and happens after the page is usable.

Mutations are one typed `submit` each; the app revalidates only the loaders the mutation affects, and reference data never revalidates.

## Open decisions

The recommendation is first in each.

1. **Who is the public API for, and how do they authenticate?** Integrations acting as a user, with personal access tokens (`Authorization: Bearer`) scoped read or write; OAuth clients later. This is why `/auth/*` is internal and `me` is meaningful. A server-to-server audience with no user would use only the optional-auth endpoints.
2. **Session cache TTL and invalidation.** 60 seconds, invalidated in process on logout and `PATCH /users/me`, no cross-task invalidation; an admin's change to `isEditor` or `canUploadImages` may take that long to show elsewhere, and a session cookie replayed on another task after logout keeps working for up to the TTL.
3. **`/api/v1` now.** Yes: public URLs are new and stable from the start. No `v2` is planned; breaking changes go through expand-migrate-contract.
4. **One `PATCH /content/{id}` or several?** One, for every scalar field, with per-field permission checks inside. The alternative, one endpoint per concern, keeps each route's rule obvious but recreates sprawl.
5. **Class codes.** `GET /codes/{code}` resolves to an assignment and the student page is `/assignment/:assignmentId`; entry by code costs one extra round trip once. The alternative, accepting `code:12345` wherever an assignment id goes, avoids that at the cost of two id forms.
6. **Who holds content created in a shared folder.** The folder's owner: `ownerId` is a property of the tree, inherited on create and on move, and `authors` records who wrote it. The alternative, creator-owns, needs a transfer-ownership command and a rule for what happens when the creator's access is revoked.
7. **What `followLatest` does to summative assignments.** Allowed, with the same rule (new attempts only), since the instructor chose it. The alternative is to refuse it for `summative` so that every student of a graded assignment sees the same revision; that can also be a UI default rather than an API rule.
8. **Revision cadence and thinning.** Materialise after three minutes idle, on last disconnect, and at most every ten minutes while editing; keep everything for a day, one an hour for a month, one a day after that; never thin a named or referenced revision. The numbers are a product choice; what the design fixes is that revisions are automatic, keyed by `cid`, and never thinned while referenced.
9. **A published submission whose item goes private.** The pinned revision stays readable through the library, because publication was the owner's own act and readers may have linked to it; unpublishing is explicit. The alternative, suspending publication when the `anyone` grant is removed, is simpler to explain and loses the item from the library on an accidental change.
10. **Bulk atomicity and bound.** All-or-nothing, with a per-id outcome list, at most 100 ids per command.
11. **Lists without source.** List items never carry DoenetML.
12. **Reads with side effects.** None; `POST /users/me/recent` and `POST /content/{id}/views` are explicit writes the app fires without awaiting. Callers that don't send them don't count toward recency or popularity.
13. **Pagination from the start.** `limit` and `cursor` on every collection, default 500, so the app's behaviour doesn't change and the public surface is bounded.
14. **Search as one resource with facets.** `GET /search/content` returns hits plus opt-in facets; authors, trending and recent are separate requests in parallel.
15. **Content type names on the wire.** `document`, `problemSet`, `folder`, `image`, the names people use, rather than the database enum's `singleDoc`, `sequence`. The handlers translate.
16. **What "no slower" means.** `apiDepth` 1 is the rule. `apiRequests` and database queries per scenario are snapshotted and every change is reviewed in the PR that causes it, with the aim of the minimum a page needs rather than parity with any earlier number.
