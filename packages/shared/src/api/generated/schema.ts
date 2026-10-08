// Generated from the API contract by
// `npm run contract:generate --workspace @doenet-tools/api`. Do not edit.

export interface paths {
  "/assign/getAssigned": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List the assignments the signed-in user has been assigned */
    get: operations["getAssigned"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    AssignmentInfo: {
      /** Format: date-time */
      assignmentClosedOn: string;
      /** @enum {string} */
      assignmentStatus: "Unassigned" | "Closed" | "Open";
      classCode: number | null;
      hasScoreData: boolean;
      individualizeByStudent: boolean;
      maxAttempts: number;
      mode: components["schemas"]["AssignmentMode"];
    };
    /** @enum {string} */
    AssignmentMode: "formative" | "summative";
    Content:
      | {
          assignmentInfo?: components["schemas"]["AssignmentInfo"];
          categories: {
            code: string;
            description: string;
            id: number;
            sortIndex: number;
            term: string;
          }[];
          classifications: components["schemas"]["ContentClassification"][];
          /** Format: short-uuid */
          contentId: string;
          doenetML: string;
          doenetmlVersion: components["schemas"]["DoenetmlVersion"];
          isPublic: boolean;
          isShared: boolean;
          licenseCode: ("CCDUAL" | "CCBYSA" | "CCBYNCSA") | null;
          name: string;
          numVariants: number;
          owner?: components["schemas"]["UserInfo"];
          /** Format: short-uuid */
          ownerId: string;
          parent: {
            /** Format: short-uuid */
            contentId: string;
            isPublic: boolean;
            isShared: boolean;
            name: string;
            sharedWith: components["schemas"]["UserInfoWithEmail"][];
            type: components["schemas"]["ContentType"];
            visibility: components["schemas"]["Visibility"];
          } | null;
          repeatInProblemSet?: number;
          revisionNum?: number;
          sharedWith: components["schemas"]["UserInfoWithEmail"][];
          /** @constant */
          type: "singleDoc";
          visibility: components["schemas"]["Visibility"];
        }
      | {
          assignmentInfo?: components["schemas"]["AssignmentInfo"];
          categories: {
            code: string;
            description: string;
            id: number;
            sortIndex: number;
            term: string;
          }[];
          children: components["schemas"]["Content"][];
          classifications: components["schemas"]["ContentClassification"][];
          /** Format: short-uuid */
          contentId: string;
          isPublic: boolean;
          isShared: boolean;
          licenseCode: ("CCDUAL" | "CCBYSA" | "CCBYNCSA") | null;
          name: string;
          numToSelect: number;
          owner?: components["schemas"]["UserInfo"];
          /** Format: short-uuid */
          ownerId: string;
          parent: {
            /** Format: short-uuid */
            contentId: string;
            isPublic: boolean;
            isShared: boolean;
            name: string;
            sharedWith: components["schemas"]["UserInfoWithEmail"][];
            type: components["schemas"]["ContentType"];
            visibility: components["schemas"]["Visibility"];
          } | null;
          revisionNum?: number;
          selectByVariant: boolean;
          sharedWith: components["schemas"]["UserInfoWithEmail"][];
          /** @constant */
          type: "select";
          visibility: components["schemas"]["Visibility"];
        }
      | {
          assignmentInfo?: components["schemas"]["AssignmentInfo"];
          categories: {
            code: string;
            description: string;
            id: number;
            sortIndex: number;
            term: string;
          }[];
          children: components["schemas"]["Content"][];
          classifications: components["schemas"]["ContentClassification"][];
          /** Format: short-uuid */
          contentId: string;
          isPublic: boolean;
          isShared: boolean;
          licenseCode: ("CCDUAL" | "CCBYSA" | "CCBYNCSA") | null;
          name: string;
          owner?: components["schemas"]["UserInfo"];
          /** Format: short-uuid */
          ownerId: string;
          paginate: boolean;
          parent: {
            /** Format: short-uuid */
            contentId: string;
            isPublic: boolean;
            isShared: boolean;
            name: string;
            sharedWith: components["schemas"]["UserInfoWithEmail"][];
            type: components["schemas"]["ContentType"];
            visibility: components["schemas"]["Visibility"];
          } | null;
          revisionNum?: number;
          sharedWith: components["schemas"]["UserInfoWithEmail"][];
          shuffle: boolean;
          /** @constant */
          type: "sequence";
          visibility: components["schemas"]["Visibility"];
        }
      | {
          assignmentInfo?: components["schemas"]["AssignmentInfo"];
          categories: {
            code: string;
            description: string;
            id: number;
            sortIndex: number;
            term: string;
          }[];
          children: components["schemas"]["Content"][];
          classifications: components["schemas"]["ContentClassification"][];
          /** Format: short-uuid */
          contentId: string;
          isPublic: boolean;
          isShared: boolean;
          licenseCode: ("CCDUAL" | "CCBYSA" | "CCBYNCSA") | null;
          name: string;
          owner?: components["schemas"]["UserInfo"];
          /** Format: short-uuid */
          ownerId: string;
          parent: {
            /** Format: short-uuid */
            contentId: string;
            isPublic: boolean;
            isShared: boolean;
            name: string;
            sharedWith: components["schemas"]["UserInfoWithEmail"][];
            type: components["schemas"]["ContentType"];
            visibility: components["schemas"]["Visibility"];
          } | null;
          revisionNum?: number;
          sharedWith: components["schemas"]["UserInfoWithEmail"][];
          /** @constant */
          type: "folder";
          visibility: components["schemas"]["Visibility"];
        }
      | {
          assignmentInfo?: components["schemas"]["AssignmentInfo"];
          categories: {
            code: string;
            description: string;
            id: number;
            sortIndex: number;
            term: string;
          }[];
          classifications: components["schemas"]["ContentClassification"][];
          /** Format: short-uuid */
          contentId: string;
          imageAuthorName?: string | null;
          imageAuthorUrl?: string | null;
          imageLicenseCodes?: string | null;
          imageLicenseVersion?: string | null;
          imageOriginalUrl?: string | null;
          imageSource?: string | null;
          imageTitle?: string | null;
          isPublic: boolean;
          isShared: boolean;
          licenseCode: ("CCDUAL" | "CCBYSA" | "CCBYNCSA") | null;
          name: string;
          owner?: components["schemas"]["UserInfo"];
          /** Format: short-uuid */
          ownerId: string;
          parent: {
            /** Format: short-uuid */
            contentId: string;
            isPublic: boolean;
            isShared: boolean;
            name: string;
            sharedWith: components["schemas"]["UserInfoWithEmail"][];
            type: components["schemas"]["ContentType"];
            visibility: components["schemas"]["Visibility"];
          } | null;
          sharedWith: components["schemas"]["UserInfoWithEmail"][];
          /** @constant */
          type: "image";
          visibility: components["schemas"]["Visibility"];
        };
    ContentClassification: {
      code: string;
      descriptions: {
        description: string;
        sortIndex: number;
        subCategory: {
          category: {
            category: string;
            id: number;
            system: {
              categoriesInDescription: boolean;
              categoryLabel: string;
              descriptionLabel: string;
              id: number;
              name: string;
              shortName: string;
              subCategoryLabel: string;
              type: string;
            };
          };
          id: number;
          sortIndex: number;
          subCategory: string;
        };
      }[];
      id: number;
    };
    /** @enum {string} */
    ContentType: "singleDoc" | "select" | "sequence" | "folder" | "image";
    DoenetmlVersion: {
      default: boolean;
      deprecated: boolean;
      deprecationMessage: string;
      displayedVersion: string;
      fullVersion: string;
      id: number;
      removed: boolean;
    };
    ErrorResponse: {
      details?: string;
      error: string;
    };
    UserInfo: {
      firstNames: string | null;
      isAnonymous?: boolean;
      isMaskForLibrary?: boolean;
      lastNames: string;
      numCommunity?: number;
      numLibrary?: number;
      /** Format: short-uuid */
      userId: string;
    };
    UserInfoWithEmail: {
      canUploadImages?: boolean;
      email: string | null;
      firstNames: string | null;
      isAnonymous?: boolean;
      isAuthor?: boolean;
      isEditor?: boolean;
      isMaskForLibrary?: boolean;
      lastNames: string;
      numCommunity?: number;
      numLibrary?: number;
      /** @enum {string} */
      theme?: "system" | "light" | "dark";
      /** Format: short-uuid */
      userId: string;
    };
    /** @enum {string} */
    Visibility: "private" | "unlisted" | "public";
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  getAssigned: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            assignments: components["schemas"]["Content"][];
            user: components["schemas"]["UserInfo"];
          };
        };
      };
      /** @description Invalid request */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not signed in, or not permitted */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      /** @description Internal server error */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
}
