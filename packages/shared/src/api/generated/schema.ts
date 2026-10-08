// Generated from the API contract by
// `npm run contract:generate --workspace @doenet-tools/api`. Do not edit.

export interface paths {
  "/assign/createAssignment": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Create an assignment by remixing an activity into a folder */
    post: operations["createAssignment"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getAllAssignmentScores/{parentId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getAllAssignmentScores"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
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
  "/assign/getAssignedScores": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getAssignedScores"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getAssignmentData/{assignmentId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get what the signed-in user needs to take an assignment */
    get: operations["getAssignmentData"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getAssignmentResponseOverview/{contentId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getAssignmentResponseOverview"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getAssignmentResponseStudent/{contentId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** The signed-in user's own responses to an assignment */
    get: operations["getOwnAssignmentResponse"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getAssignmentResponseStudent/{contentId}/{studentUserId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** A student's responses to an assignment owned by the signed-in user */
    get: operations["getAssignmentResponseStudent"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getStudentAssignmentScores/{studentUserId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Scores of a student on all assignments of the signed-in user */
    get: operations["getStudentAssignmentScores"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getStudentAssignmentScores/{studentUserId}/{parentId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Scores of a student on the assignments in a folder */
    get: operations["getStudentAssignmentScoresInFolder"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/getStudentSubmittedResponses/{contentId}/{studentUserId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["getStudentSubmittedResponses"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/recordSubmittedEvent": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["recordSubmittedEvent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/updateAssignmentClosedOn": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["updateAssignmentClosedOn"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/updateAssignmentMaxAttempts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["updateAssignmentMaxAttempts"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/assign/updateAssignmentSettings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["updateAssignmentSettings"];
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
    ItemScores: {
      itemAttemptNumber: number;
      itemNumber: number;
      score: number;
    }[];
    LatestAttempt: {
      attemptNumber: number;
      itemScores: components["schemas"]["ItemScores"];
      score: number;
    };
    ScoreData:
      | {
          /** @constant */
          calculatedScore: false;
        }
      | {
          bestAttemptNumber: number;
          /** @constant */
          calculatedScore: true;
          itemScores: components["schemas"]["ItemScores"];
          latestAttempt: components["schemas"]["LatestAttempt"];
          score: number;
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
  createAssignment: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          /** Format: date-time */
          closedOn: string;
          /** Format: short-uuid */
          contentId: string;
          destinationParentId: string | null;
        };
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            /** Format: date-time */
            assignmentClosedOn: string;
            /** Format: short-uuid */
            assignmentId: string;
            classCode: number | null;
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
  getAllAssignmentScores: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        parentId: string;
      };
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
            folder: {
              /** Format: short-uuid */
              contentId: string;
              name: string;
            };
            orderedAssignments: {
              /** Format: short-uuid */
              contentId: string;
              name: string;
            }[];
            orderedStudents: components["schemas"]["UserInfo"][];
            scores: (number | null)[][];
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
  getAssignedScores: {
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
            orderedActivityScores: {
              activityName: string;
              /** Format: short-uuid */
              contentId: string;
              score: number | null;
            }[];
            userData: components["schemas"]["UserInfo"];
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
  getAssignmentData: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        assignmentId: string;
      };
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
          "application/json":
            | {
                assignment: components["schemas"]["Content"];
                /** @constant */
                assignmentOpen: false;
              }
            | {
                assignment: components["schemas"]["Content"];
                /** @constant */
                assignmentOpen: true;
                scoreData: components["schemas"]["ScoreData"];
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
  getAssignmentResponseOverview: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        contentId: string;
      };
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
            content: components["schemas"]["Content"];
            itemNames: string[];
            scoreSummary: {
              mode: components["schemas"]["AssignmentMode"];
              scores: {
                bestAttemptNumber: number;
                itemScores: components["schemas"]["ItemScores"] | null;
                latestAttempt: components["schemas"]["LatestAttempt"] | null;
                score: number;
                user: components["schemas"]["UserInfo"];
              }[];
            };
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
  getOwnAssignmentResponse: {
    parameters: {
      query: {
        attemptNumber?: number;
        itemNumber?: number;
        shuffledOrder: string;
      };
      header?: never;
      path: {
        contentId: string;
      };
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
          "application/json":
            | {
                allStudents: {
                  firstNames: string | null;
                  lastNames: string;
                  /** Format: short-uuid */
                  userId: string;
                }[];
                assignment: {
                  /** Format: short-uuid */
                  contentId: string;
                  isOpen: boolean;
                  name: string;
                  shuffledOrder: boolean;
                  type: components["schemas"]["ContentType"];
                };
                attemptNumber: number;
                attemptScores: {
                  attemptNumber: number;
                  score: number;
                }[];
                content: components["schemas"]["Content"];
                itemAttemptState: {
                  /** Format: short-uuid */
                  docId: string;
                  itemNumber?: number;
                  score: number;
                  shuffledItemNumber?: number;
                  state: string | null;
                  variant: number;
                };
                itemNames: string[];
                itemScores: components["schemas"]["ItemScores"];
                mode: components["schemas"]["AssignmentMode"];
                overallScores: {
                  bestAttemptNumber: number;
                  /** @constant */
                  calculatedScore: true;
                  itemScores: components["schemas"]["ItemScores"];
                  latestAttempt: components["schemas"]["LatestAttempt"];
                  score: number;
                };
                responseCounts: (string | number)[][];
                /** @constant */
                singleItemAttempt: true;
                user: components["schemas"]["UserInfo"];
              }
            | {
                allAttemptScores:
                  | {
                      /** @constant */
                      byItem: true;
                      itemAttemptScores: {
                        attempts: {
                          itemAttemptNumber: number;
                          score: number;
                        }[];
                        itemNumber: number;
                        shuffledItemNumber: number;
                      }[];
                    }
                  | {
                      attemptScores: {
                        attemptNumber: number;
                        items: {
                          itemNumber: number;
                          score: number;
                          shuffledItemNumber: number;
                        }[];
                        score: number;
                      }[];
                      /** @constant */
                      byItem: false;
                    };
                allStudents: {
                  firstNames: string | null;
                  lastNames: string;
                  /** Format: short-uuid */
                  userId: string;
                }[];
                assignment: {
                  /** Format: short-uuid */
                  contentId: string;
                  isOpen: boolean;
                  name: string;
                  shuffledOrder: boolean;
                  type: components["schemas"]["ContentType"];
                };
                itemNames: string[];
                mode: components["schemas"]["AssignmentMode"];
                overallScores: {
                  bestAttemptNumber: number;
                  /** @constant */
                  calculatedScore: true;
                  itemScores: components["schemas"]["ItemScores"];
                  latestAttempt: components["schemas"]["LatestAttempt"];
                  score: number;
                };
                /** @constant */
                singleItemAttempt: false;
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
  getAssignmentResponseStudent: {
    parameters: {
      query: {
        attemptNumber?: number;
        itemNumber?: number;
        shuffledOrder: string;
      };
      header?: never;
      path: {
        contentId: string;
        studentUserId: string;
      };
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
          "application/json":
            | {
                allStudents: {
                  firstNames: string | null;
                  lastNames: string;
                  /** Format: short-uuid */
                  userId: string;
                }[];
                assignment: {
                  /** Format: short-uuid */
                  contentId: string;
                  isOpen: boolean;
                  name: string;
                  shuffledOrder: boolean;
                  type: components["schemas"]["ContentType"];
                };
                attemptNumber: number;
                attemptScores: {
                  attemptNumber: number;
                  score: number;
                }[];
                content: components["schemas"]["Content"];
                itemAttemptState: {
                  /** Format: short-uuid */
                  docId: string;
                  itemNumber?: number;
                  score: number;
                  shuffledItemNumber?: number;
                  state: string | null;
                  variant: number;
                };
                itemNames: string[];
                itemScores: components["schemas"]["ItemScores"];
                mode: components["schemas"]["AssignmentMode"];
                overallScores: {
                  bestAttemptNumber: number;
                  /** @constant */
                  calculatedScore: true;
                  itemScores: components["schemas"]["ItemScores"];
                  latestAttempt: components["schemas"]["LatestAttempt"];
                  score: number;
                };
                responseCounts: (string | number)[][];
                /** @constant */
                singleItemAttempt: true;
                user: components["schemas"]["UserInfo"];
              }
            | {
                allAttemptScores:
                  | {
                      /** @constant */
                      byItem: true;
                      itemAttemptScores: {
                        attempts: {
                          itemAttemptNumber: number;
                          score: number;
                        }[];
                        itemNumber: number;
                        shuffledItemNumber: number;
                      }[];
                    }
                  | {
                      attemptScores: {
                        attemptNumber: number;
                        items: {
                          itemNumber: number;
                          score: number;
                          shuffledItemNumber: number;
                        }[];
                        score: number;
                      }[];
                      /** @constant */
                      byItem: false;
                    };
                allStudents: {
                  firstNames: string | null;
                  lastNames: string;
                  /** Format: short-uuid */
                  userId: string;
                }[];
                assignment: {
                  /** Format: short-uuid */
                  contentId: string;
                  isOpen: boolean;
                  name: string;
                  shuffledOrder: boolean;
                  type: components["schemas"]["ContentType"];
                };
                itemNames: string[];
                mode: components["schemas"]["AssignmentMode"];
                overallScores: {
                  bestAttemptNumber: number;
                  /** @constant */
                  calculatedScore: true;
                  itemScores: components["schemas"]["ItemScores"];
                  latestAttempt: components["schemas"]["LatestAttempt"];
                  score: number;
                };
                /** @constant */
                singleItemAttempt: false;
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
  getStudentAssignmentScores: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        studentUserId: string;
      };
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
            folder: {
              /** Format: short-uuid */
              contentId: string;
              name: string;
            } | null;
            orderedActivityScores: {
              activityName: string;
              /** Format: short-uuid */
              contentId: string;
              score: number | null;
            }[];
            studentData: components["schemas"]["UserInfo"];
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
  getStudentAssignmentScoresInFolder: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        parentId: string;
        studentUserId: string;
      };
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
            folder: {
              /** Format: short-uuid */
              contentId: string;
              name: string;
            } | null;
            orderedActivityScores: {
              activityName: string;
              /** Format: short-uuid */
              contentId: string;
              score: number | null;
            }[];
            studentData: components["schemas"]["UserInfo"];
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
  getStudentSubmittedResponses: {
    parameters: {
      query: {
        answerId: string;
        contentAttemptNumber: number;
        itemAttemptNumber?: number;
        requestedItemNumber?: number;
        shuffledOrder: string;
      };
      header?: never;
      path: {
        contentId: string;
        studentUserId: string;
      };
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
            responses: {
              answerCreditAchieved: number;
              response: string;
              /** Format: date-time */
              submittedAt: string;
            }[];
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
  recordSubmittedEvent: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          answerCreditAchieved: number;
          answerId: string;
          answerNumber?: number;
          componentCreditAchieved: number;
          componentNumber: number;
          contentAttemptNumber: number;
          /** Format: short-uuid */
          contentId: string;
          itemAttemptNumber: number | null;
          itemCreditAchieved: number;
          itemNumber: number;
          response: string;
          shuffledItemNumber: number;
        };
      };
    };
    responses: {
      /** @description OK (no content) */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
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
  updateAssignmentClosedOn: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          /** Format: date-time */
          closedOn: string;
          /** Format: short-uuid */
          contentId: string;
        };
      };
    };
    responses: {
      /** @description OK (no content) */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
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
  updateAssignmentMaxAttempts: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          /** Format: short-uuid */
          contentId: string;
          maxAttempts: number;
        };
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            maxAttempts: number;
            success: boolean;
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
  updateAssignmentSettings: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          /** Format: short-uuid */
          contentId: string;
          individualizeByStudent?: boolean;
          /** @enum {string} */
          mode?: "formative" | "summative";
        };
      };
    };
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            individualizeByStudent?: boolean;
            mode?: components["schemas"]["AssignmentMode"];
            success: boolean;
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
