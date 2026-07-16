// Stage 03: create users, folders, documents, problem sets, and image rows
// on the target site from build/model.json + build/image-map.json.
//
//   npx tsx scripts/legacy-migration/03-import.ts [--dry-run] [--user=<email>]
//                                                 [--yes-target=<db-host>]
//
// Everything is journaled to build/id-map.tsv before the next create, so an
// interrupted run can simply be re-run: journaled items are skipped.
// All created content is private (images "unlisted", matching the app's
// upload flow) and licensed CCDUAL; documents keep DoenetML version 0.6.
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { loadConfig, MigrationConfig } from "./config";
import { SORT_INCREMENT, getNextSortIndex } from "../../src/utils/sort";
import { imageSourceFromStorageKey } from "../../src/media/upload.schema";
import { fromUUID, toUUID } from "../../src/utils/uuid";
import { Journal } from "./journal";
import { rewriteImageSources } from "./rewriteImages";
import { ActivityNode, Model, UserModel } from "./model";
import { planUser } from "./plan";
import { ImageMap, imageMapKey } from "./02-upload-images";

const IMAGE_LICENSE_CODES = "CC-BY";
const ROOT_FOLDER_NAME = "Copied Legacy Content";
const MAX_NAME = 190;

const prisma = new PrismaClient();

interface ImportContext {
  config: MigrationConfig;
  model: Model;
  imageMap: ImageMap;
  journal: Journal;
  doenetmlVersionId: number;
  report: Record<string, number>;
  problems: string[];
}

function bump(ctx: ImportContext, key: string, by = 1) {
  ctx.report[key] = (ctx.report[key] ?? 0) + by;
}

function trimName(name: string): string {
  const trimmed = name.trim() === "" ? "Untitled" : name.trim();
  return trimmed.length > MAX_NAME ? trimmed.slice(0, MAX_NAME) : trimmed;
}

function sortIndexFor(position: number): bigint {
  return BigInt(position) * BigInt(SORT_INCREMENT);
}

async function main() {
  const config = loadConfig();
  const buildDir = config.buildDir;
  const model: Model = JSON.parse(
    fs.readFileSync(path.join(buildDir, "model.json"), "utf8"),
  );
  const mapPath = path.join(buildDir, "image-map.json");
  const imageMap: ImageMap = fs.existsSync(mapPath)
    ? JSON.parse(fs.readFileSync(mapPath, "utf8"))
    : {};
  if (Object.keys(imageMap).length === 0) {
    console.warn(
      "image-map.json is missing or empty — image references will be left unrewritten",
    );
  }
  // Dry runs journal to a separate file: DRY placeholder rows must never make
  // a later real run skip creating the item.
  const journal = new Journal(
    path.join(buildDir, config.dryRun ? "id-map.dry-run.tsv" : "id-map.tsv"),
  );

  // ---- target guard --------------------------------------------------------
  const dbUrl = new URL(process.env.DATABASE_URL ?? "");
  const host = dbUrl.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  console.log(`Target database: ${host}:${dbUrl.port} ${dbUrl.pathname}`);
  if (!isLocal && !config.dryRun && config.yesTarget !== host) {
    throw new Error(
      `Refusing to write to non-local database ${host} without --yes-target=${host}`,
    );
  }

  // ---- preflight ------------------------------------------------------------
  await prisma.imageContent.count(); // throws if the PR #2993 migration is absent
  const v06 = await prisma.doenetmlVersions.findFirstOrThrow({
    where: { displayedVersion: "0.6" },
  });
  if (v06.removed) {
    throw new Error("doenetmlVersions 0.6 is marked removed on the target");
  }
  await prisma.licenses.findUniqueOrThrow({ where: { code: "CCDUAL" } });

  const ctx: ImportContext = {
    config,
    model,
    imageMap,
    journal,
    doenetmlVersionId: v06.id,
    report: {},
    problems: [],
  };

  // ---- per-user import -------------------------------------------------------
  for (const user of model.users) {
    if (config.onlyUser && user.email.toLowerCase() !== config.onlyUser) {
      continue;
    }
    try {
      await importUser(ctx, user);
      bump(ctx, "usersImported");
    } catch (err) {
      ctx.problems.push(`user ${user.email}: ${String(err)}`);
      bump(ctx, "usersFailed");
      console.error(`FAILED user ${user.email}:`, err);
    }
  }

  // ---- report ----------------------------------------------------------------
  const lines = [
    `# Legacy import report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Dry run: ${config.dryRun}`,
    ``,
    `## Totals`,
    ``,
    ...Object.entries(ctx.report)
      .sort()
      .map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Problems (${ctx.problems.length})`,
    ``,
    ...ctx.problems.map((p) => `- ${p}`),
    ``,
  ];
  const reportPath = path.join(buildDir, "import-report.md");
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`Wrote ${reportPath}`);
  console.log(ctx.report);

  await prisma.$disconnect();
  if (ctx.problems.length > 0) {
    process.exitCode = 1;
  }
}

async function importUser(ctx: ImportContext, user: UserModel) {
  const { config, journal } = ctx;
  const email = user.email;

  // ---- match or create the user ---------------------------------------------
  let ownerId: Uint8Array | null = null;
  const journaledUser = journal.get("user", user.legacyUserId, email);
  if (journaledUser) {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (!existing && !config.dryRun) {
      throw new Error(`journaled user vanished from target`);
    }
    ownerId = existing?.userId ?? null;
  } else {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      ownerId = existing.userId;
      bump(ctx, "usersMatched");
    } else if (config.dryRun) {
      bump(ctx, "usersWouldCreate");
    } else {
      // Mirrors findOrCreateUser (src/query/user.ts): username = email,
      // non-anonymous users are premium, names may be filled in on first login
      // (only when lastNames is ""; a real legacy name is preserved).
      const created = await prisma.users.create({
        data: {
          email,
          username: email,
          firstNames: user.firstName.trim() || null,
          lastNames: user.lastName.trim(),
          isPremium: true,
        },
      });
      ownerId = created.userId;
      bump(ctx, "usersCreated");
    }
    journal.append({
      kind: "user",
      legacyId: user.legacyUserId,
      legacyCourseId: "",
      ownerEmail: email,
      newId: ownerId ? shortId(ownerId) : "DRY",
      newType: "user",
      name: `${user.firstName} ${user.lastName}`.trim() || user.screenName,
      notes: journaledUser ? "" : ownerId ? "matched-or-created" : "dry-run",
    });
  }

  // ---- duplicate-import guard -------------------------------------------------
  const rootJournaled = journal.get(
    "folder",
    `root:${user.legacyUserId}`,
    email,
  );
  if (!rootJournaled && ownerId) {
    const existingRoot = await prisma.content.findFirst({
      where: {
        ownerId,
        parentId: null,
        type: "folder",
        name: ROOT_FOLDER_NAME,
        isDeletedOn: null,
      },
    });
    if (existingRoot) {
      throw new Error(
        `already has a non-journaled "${ROOT_FOLDER_NAME}" folder — skipping to avoid duplicates`,
      );
    }
  }

  const plan = planUser(user, ctx.model);
  const folderIds = new Map<string, Uint8Array | null>(); // key -> content id (null in dry-run)
  // children each folder already holds (activities + subfolders come from the
  // plan indices; images get appended after)
  const childCounts = new Map<string, number>();

  // ---- root folder --------------------------------------------------------------
  let rootSortIndex = 0n;
  if (ownerId) {
    const lastIndex = (
      await prisma.content.aggregate({
        where: { ownerId, parentId: null },
        _max: { sortIndex: true },
      })
    )._max.sortIndex;
    rootSortIndex = BigInt(getNextSortIndex(lastIndex));
  }
  const rootId = await ensureFolder(ctx, user, {
    key: plan.rootKey,
    name: ROOT_FOLDER_NAME,
    parentId: null,
    ownerId,
    sortIndex: rootSortIndex,
    legacyCourseId: "",
  });
  folderIds.set(plan.rootKey, rootId);

  // ---- planned folders ------------------------------------------------------------
  for (const folder of plan.folders) {
    const parentId = folderIds.get(folder.parentKey ?? plan.rootKey);
    if (parentId === undefined) {
      throw new Error(
        `parent folder ${folder.parentKey} missing for ${folder.key}`,
      );
    }
    const id = await ensureFolder(ctx, user, {
      key: folder.key,
      name: trimName(folder.name),
      parentId,
      ownerId,
      sortIndex: sortIndexFor(folder.index),
      legacyCourseId: folder.legacyCourseId,
    });
    folderIds.set(folder.key, id);
    const parentKey = folder.parentKey ?? plan.rootKey;
    childCounts.set(
      parentKey,
      Math.max(childCounts.get(parentKey) ?? 0, folder.index + 1),
    );
  }

  // ---- activities -------------------------------------------------------------------
  for (const planned of plan.activities) {
    const parentId = folderIds.get(planned.folderKey);
    if (parentId === undefined) {
      throw new Error(`folder ${planned.folderKey} missing for activity`);
    }
    await importActivity(ctx, user, planned.node, {
      folderKey: planned.folderKey,
      parentId,
      ownerId,
      sortIndex: sortIndexFor(planned.index),
    });
    childCounts.set(
      planned.folderKey,
      Math.max(childCounts.get(planned.folderKey) ?? 0, planned.index + 1),
    );
  }

  // ---- images ------------------------------------------------------------------------
  for (const [folderKey, cids] of plan.imagesByFolder) {
    const parentId = folderIds.get(folderKey);
    if (parentId === undefined) {
      throw new Error(`folder ${folderKey} missing for images`);
    }
    for (const cid of cids) {
      const legacyId = `${folderKey}:${cid}`;
      if (journal.get("image", legacyId, user.email)) continue;
      const entry = ctx.imageMap[imageMapKey(folderKey, cid)];
      if (!entry) {
        ctx.problems.push(
          `image ${cid} for ${folderKey}: not in image-map.json (run 02-upload-images)`,
        );
        bump(ctx, "imagesMissingFromMap");
        continue;
      }
      const info = ctx.model.supportFiles[cid];
      const name = trimName(
        info.description || info.asFileName || "Migrated image",
      );
      const position = childCounts.get(folderKey) ?? 0;
      childCounts.set(folderKey, position + 1);
      let newId = "DRY";
      if (!ctx.config.dryRun && ownerId && parentId) {
        const created = await prisma.content.create({
          data: {
            type: "image",
            ownerId,
            parentId,
            name,
            sortIndex: sortIndexFor(position),
            isPublic: false,
            visibility: "unlisted", // matches createImageContent (upload flow)
            licenseCode: "CCDUAL",
            imageData: {
              create: {
                mimeType: entry.mimeType,
                sizeBytes: BigInt(entry.sizeBytes),
                storageKey: entry.storageKey,
                licenseCodes: IMAGE_LICENSE_CODES,
                authorName: info.uploaderName,
                title: info.description,
              },
            },
          },
        });
        newId = shortId(created.id);
      }
      journal.append({
        kind: "image",
        legacyId,
        legacyCourseId: "",
        ownerEmail: user.email,
        newId,
        newType: "image",
        name,
        notes: `cid=${cid} storageKey=${entry.storageKey}`,
      });
      bump(ctx, "imagesCreated");
    }
  }
}

async function ensureFolder(
  ctx: ImportContext,
  user: UserModel,
  args: {
    key: string;
    name: string;
    parentId: Uint8Array | null;
    ownerId: Uint8Array | null;
    sortIndex: bigint;
    legacyCourseId: string;
  },
): Promise<Uint8Array | null> {
  const journaled = ctx.journal.get("folder", args.key, user.email);
  if (journaled) {
    if (ctx.config.dryRun || !args.ownerId) return null;
    // Resolve the journaled short id back to the real row.
    const found = await findByShortId(journaled.newId);
    if (found) return found.id;
    throw new Error(`journaled folder ${args.key} not found on target`);
  }

  let newId = "DRY";
  let id: Uint8Array | null = null;
  if (!ctx.config.dryRun && args.ownerId) {
    const created = await prisma.content.create({
      data: {
        type: "folder",
        ownerId: args.ownerId,
        parentId: args.parentId,
        name: args.name,
        sortIndex: args.sortIndex,
        isPublic: false,
        visibility: "private",
        licenseCode: "CCDUAL",
      },
    });
    id = created.id;
    newId = shortId(created.id);
  }
  ctx.journal.append({
    kind: "folder",
    legacyId: args.key,
    legacyCourseId: args.legacyCourseId,
    ownerEmail: user.email,
    newId,
    newType: "folder",
    name: args.name,
    notes: "",
  });
  bump(ctx, "foldersCreated");
  return id;
}

async function importActivity(
  ctx: ImportContext,
  user: UserModel,
  node: ActivityNode,
  args: {
    folderKey: string;
    parentId: Uint8Array | null;
    ownerId: Uint8Array | null;
    sortIndex: bigint;
  },
) {
  if (ctx.journal.get("activity", node.legacyDoenetId, user.email)) {
    return; // created in a previous run (children journaled in the same transaction)
  }

  // Read and rewrite every page source up front, so the DB transaction below
  // holds no file I/O.
  const pageSources: { pageId: string; label: string; source: string }[] = [];
  for (const page of node.pages) {
    let source = "";
    if (page.sourceFile && page.bytes > 0) {
      source = fs.readFileSync(
        path.join(ctx.config.legacyMediaDir, page.sourceFile),
        "utf8",
      );
      const rewritten = rewriteImageSources(source, (cid) => {
        const entry = ctx.imageMap[imageMapKey(args.folderKey, cid)];
        return entry ? imageSourceFromStorageKey(entry.storageKey) : null;
      });
      source = rewritten.source;
      bump(ctx, "imageRefsRewritten", rewritten.rewritten.length);
      bump(ctx, "imageRefsUnresolved", rewritten.unresolved.length);
    } else if (page.sourceFile === null) {
      bump(ctx, "pagesWithMissingFiles");
    }
    pageSources.push({ pageId: page.pageId, label: page.label, source });
  }

  const notes = node.issues.join(",");
  const name = trimName(node.label);

  if (ctx.config.dryRun || !args.ownerId || args.parentId === undefined) {
    journalActivity(ctx, user, node, "DRY", [], notes);
    return;
  }

  const docData = (
    source: string,
    extra: Partial<Prisma.contentUncheckedCreateInput>,
  ) =>
    ({
      type: "singleDoc",
      ownerId: args.ownerId!,
      name,
      source,
      doenetmlVersionId: ctx.doenetmlVersionId,
      isPublic: false,
      visibility: "private",
      licenseCode: "CCDUAL",
      ...extra,
    }) as Prisma.contentUncheckedCreateInput;

  if (node.shape === "sequence") {
    // one transaction per activity: the problem set and its documents appear
    // together or not at all
    const { activityId, pageIds } = await prisma.$transaction(async (tx) => {
      const sequence = await tx.content.create({
        data: {
          type: "sequence",
          ownerId: args.ownerId!,
          parentId: args.parentId,
          name,
          sortIndex: args.sortIndex,
          isPublic: false,
          visibility: "private",
          licenseCode: "CCDUAL",
        },
      });
      const pageIds: string[] = [];
      for (let i = 0; i < pageSources.length; i++) {
        const page = pageSources[i];
        const doc = await tx.content.create({
          data: {
            ...docData(page.source, {
              parentId: sequence.id,
              sortIndex: sortIndexFor(i),
            }),
            name: trimName(page.label),
          },
        });
        pageIds.push(shortId(doc.id));
      }
      return { activityId: shortId(sequence.id), pageIds };
    });
    journalActivity(ctx, user, node, activityId, pageIds, notes);
    bump(ctx, "problemSetsCreated");
    bump(ctx, "docsCreated", pageSources.length);
  } else {
    // singleDoc or empty: one document carrying the activity's label
    const source = pageSources[0]?.source ?? "";
    const doc = await prisma.content.create({
      data: docData(source, {
        parentId: args.parentId,
        sortIndex: args.sortIndex,
      }),
    });
    journalActivity(
      ctx,
      user,
      node,
      shortId(doc.id),
      pageSources.length > 0 ? [shortId(doc.id)] : [],
      node.shape === "empty" ? joinNotes(notes, "empty-activity") : notes,
    );
    bump(ctx, "docsCreated");
    if (node.shape === "empty") bump(ctx, "emptyActivities");
  }
}

function journalActivity(
  ctx: ImportContext,
  user: UserModel,
  node: ActivityNode,
  newId: string,
  pageNewIds: string[],
  notes: string,
) {
  ctx.journal.append({
    kind: "activity",
    legacyId: node.legacyDoenetId,
    legacyCourseId: node.legacyCourseId,
    ownerEmail: user.email,
    newId,
    newType: node.shape === "sequence" ? "sequence" : "singleDoc",
    name: node.label,
    notes,
  });
  node.pages.forEach((page, i) => {
    ctx.journal.append({
      kind: "page",
      legacyId: `${node.legacyDoenetId}/${page.pageId}#${i}`,
      legacyCourseId: node.legacyCourseId,
      ownerEmail: user.email,
      newId:
        pageNewIds[i] ??
        (node.shape === "sequence" ? "DRY" : (pageNewIds[0] ?? "DRY")),
      newType: "singleDoc",
      name: page.label,
      notes: `in:${node.legacyDoenetId}`,
    });
  });
}

function joinNotes(a: string, b: string): string {
  return [a, b].filter((s) => s !== "").join(",");
}

/** short-uuid form used in new-site URLs */
function shortId(id: Uint8Array): string {
  return fromUUID(id);
}

async function findByShortId(newId: string) {
  if (newId === "DRY") return null;
  try {
    return await prisma.content.findUnique({ where: { id: toUUID(newId) } });
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
