/**
 * Response schemas for the domain types in `src/types.ts`, describing their
 * JSON wire form (UUIDs and dates as strings). Schemas with `.meta({ id })`
 * become named components in the OpenAPI document.
 *
 * These mirror `src/types.ts`; handlers returning those types are
 * type-checked against these schemas by `implement`.
 */
import { z } from "zod";

export const uuidWire = z.string().meta({ format: "short-uuid" });
export const dateTimeWire = z.string().meta({ format: "date-time" });

export const contentTypeSchema = z
  .enum(["singleDoc", "select", "sequence", "folder", "image"])
  .meta({ id: "ContentType" });

export const assignmentModeSchema = z
  .enum(["formative", "summative"])
  .meta({ id: "AssignmentMode" });

const visibilitySchema = z
  .enum(["private", "unlisted", "public"])
  .meta({ id: "Visibility" });

export const userInfoSchema = z
  .object({
    userId: uuidWire,
    firstNames: z.string().nullable(),
    lastNames: z.string(),
    isAnonymous: z.boolean().optional(),
    numLibrary: z.number().optional(),
    numCommunity: z.number().optional(),
    isMaskForLibrary: z.boolean().optional(),
  })
  .meta({ id: "UserInfo" });

export const userInfoWithEmailSchema = userInfoSchema
  .extend({
    email: z.string().nullable(),
    isAuthor: z.boolean().optional(),
    isEditor: z.boolean().optional(),
    canUploadImages: z.boolean().optional(),
    theme: z.enum(["system", "light", "dark"]).optional(),
  })
  .meta({ id: "UserInfoWithEmail" });

const doenetmlVersionSchema = z
  .object({
    id: z.number(),
    displayedVersion: z.string(),
    fullVersion: z.string(),
    default: z.boolean(),
    deprecated: z.boolean(),
    removed: z.boolean(),
    deprecationMessage: z.string(),
  })
  .meta({ id: "DoenetmlVersion" });

const contentClassificationSchema = z
  .object({
    id: z.number(),
    code: z.string(),
    descriptions: z.array(
      z.object({
        description: z.string(),
        sortIndex: z.number(),
        subCategory: z.object({
          id: z.number(),
          subCategory: z.string(),
          sortIndex: z.number(),
          category: z.object({
            id: z.number(),
            category: z.string(),
            system: z.object({
              id: z.number(),
              name: z.string(),
              shortName: z.string(),
              categoryLabel: z.string(),
              subCategoryLabel: z.string(),
              descriptionLabel: z.string(),
              categoriesInDescription: z.boolean(),
              type: z.string(),
            }),
          }),
        }),
      }),
    ),
  })
  .meta({ id: "ContentClassification" });

const assignmentInfoSchema = z
  .object({
    assignmentStatus: z.enum(["Unassigned", "Closed", "Open"]),
    classCode: z.number().nullable(),
    assignmentClosedOn: dateTimeWire,
    hasScoreData: z.boolean(),
    mode: assignmentModeSchema,
    individualizeByStudent: z.boolean(),
    maxAttempts: z.number(),
  })
  .meta({ id: "AssignmentInfo" });

const contentBaseShape = {
  contentId: uuidWire,
  ownerId: uuidWire,
  owner: userInfoSchema.optional(),
  name: z.string(),
  isPublic: z.boolean(),
  visibility: visibilitySchema,
  isShared: z.boolean(),
  sharedWith: z.array(userInfoWithEmailSchema),
  licenseCode: z.enum(["CCDUAL", "CCBYSA", "CCBYNCSA"]).nullable(),
  categories: z.array(
    z.object({
      id: z.number(),
      code: z.string(),
      term: z.string(),
      description: z.string(),
      sortIndex: z.number(),
    }),
  ),
  classifications: z.array(contentClassificationSchema),
  parent: z
    .object({
      contentId: uuidWire,
      name: z.string(),
      type: contentTypeSchema,
      isPublic: z.boolean(),
      visibility: visibilitySchema,
      isShared: z.boolean(),
      sharedWith: z.array(userInfoWithEmailSchema),
    })
    .nullable(),
  assignmentInfo: assignmentInfoSchema.optional(),
};

const docSchema = z.object({
  ...contentBaseShape,
  type: z.literal("singleDoc"),
  numVariants: z.number(),
  revisionNum: z.number().optional(),
  doenetML: z.string(),
  doenetmlVersion: doenetmlVersionSchema,
  repeatInProblemSet: z.number().optional(),
});

const questionBankBase = z.object({
  ...contentBaseShape,
  type: z.literal("select"),
  revisionNum: z.number().optional(),
  numToSelect: z.number(),
  selectByVariant: z.boolean(),
});

const problemSetBase = z.object({
  ...contentBaseShape,
  type: z.literal("sequence"),
  revisionNum: z.number().optional(),
  shuffle: z.boolean(),
  paginate: z.boolean(),
});

const folderBase = z.object({
  ...contentBaseShape,
  type: z.literal("folder"),
  revisionNum: z.number().optional(),
});

const imageItemSchema = z.object({
  ...contentBaseShape,
  type: z.literal("image"),
  imageSource: z.string().nullable().optional(),
  imageAuthorName: z.string().nullable().optional(),
  imageAuthorUrl: z.string().nullable().optional(),
  imageTitle: z.string().nullable().optional(),
  imageOriginalUrl: z.string().nullable().optional(),
  imageLicenseCodes: z.string().nullable().optional(),
  imageLicenseVersion: z.string().nullable().optional(),
});

export type ContentWire =
  | z.infer<typeof docSchema>
  | z.infer<typeof imageItemSchema>
  | (z.infer<typeof questionBankBase> & { children: ContentWire[] })
  | (z.infer<typeof problemSetBase> & { children: ContentWire[] })
  | (z.infer<typeof folderBase> & { children: ContentWire[] });

export type ContentWireSchema = z.ZodType<ContentWire, ContentWire>;

const childrenShape = {
  get children(): z.ZodArray<ContentWireSchema> {
    return z.array(contentSchema);
  },
};

export const contentSchema: ContentWireSchema = z
  .discriminatedUnion("type", [
    docSchema,
    questionBankBase.extend(childrenShape),
    problemSetBase.extend(childrenShape),
    folderBase.extend(childrenShape),
    imageItemSchema,
  ])
  .meta({ id: "Content" });

export const itemScoresSchema = z
  .array(
    z.object({
      score: z.number(),
      itemNumber: z.number(),
      itemAttemptNumber: z.number(),
    }),
  )
  .meta({ id: "ItemScores" });

export const latestAttemptSchema = z
  .object({
    attemptNumber: z.number(),
    score: z.number(),
    itemScores: itemScoresSchema,
  })
  .meta({ id: "LatestAttempt" });

export const calculatedScoreDataSchema = z.object({
  calculatedScore: z.literal(true),
  score: z.number(),
  bestAttemptNumber: z.number(),
  itemScores: itemScoresSchema,
  latestAttempt: latestAttemptSchema,
});

export const scoreDataSchema = z
  .discriminatedUnion("calculatedScore", [
    z.object({ calculatedScore: z.literal(false) }),
    calculatedScoreDataSchema,
  ])
  .meta({ id: "ScoreData" });
