/** The source for creating an activity */
export type ActivitySource = SingleDocSource | SelectSource | SequenceSource;

/** The current state of an activity, including all descendants */
export type ActivityState = SingleDocState | SelectState | SequenceState;

/**
 * The current state of an activity, where references to the source have been eliminated.
 *
 * Useful for saving to a database, as this extraneously information has been removed.
 */
export type ActivityStateNoSource =
  | SingleDocStateNoSource
  | SelectStateNoSource
  | SequenceStateNoSource;

/** The source for creating a single doc activity */
export type SingleDocSource = {
  type: "singleDoc";
  id: string;
  title?: string;
  /**
   * If `isDescription` is `true`, then this activity is not considered one of the scored items
   * and its credit achieved is ignored.
   */
  isDescription: boolean;
  doenetML: string;
  /** The version of DoenetML that should be used to render this activity. */
  version: string;
  /** The number of variants present in `doenetML` */
  numVariants?: number;
};

/** The current state of a single doc activity */
export type SingleDocState = {
  type: "singleDoc";
  id: string;
  parentId: string | null;
  source: SingleDocSource;
  /** Used to seed the random number generate to yield the actual variants of each attempt. */
  initialVariant: number;
  /** Credit achieved (between 0 and 1) over all attempts of this activity */
  creditAchieved: number;
  /** Credit achieved from the latest submission */
  latestCreditAchieved: number;
  /** The number of the current attempt */
  attemptNumber: number;
  /** The variant selected for the current attempt */
  currentVariant: number;
  /** A list of the the variants selected in all attempts, ordered by attempt number */
  previousVariants: number[];
  /** A json object containing the state needed to reconstitute the activity of the current attempt */
  doenetState: unknown;
  /** The value of the question counter set for the beginning of this activity */
  initialQuestionCounter: number;
  /** See {@link RestrictToVariantSlice} */
  restrictToVariantSlice?: RestrictToVariantSlice;
};

/**
 * The current state of a single doc activity, where references to the source have been eliminated.
 *
 * Useful for saving to a database, as this extraneously information has been removed.
 */
export type SingleDocStateNoSource = Omit<SingleDocState, "source">;

/** The source for creating a select activity */
export type SelectSource = {
  type: "select";
  id: string;
  title?: string;
  /** The child activities to select from */
  items: ActivitySource[];
  /** The number of child activities to select (without replacement) for each attempt */
  numToSelect: number;
  /**
   * Whether or not to consider each variant of each child a separate option to select from.
   * If `selectByVariant` is `true`, the selection is from the total set of all variants,
   * meaning selection probabilities is weighted by the number of variants each child has,
   * and, if `numToSelect` > 1, a child could be selected multiple times for a given attempt.
   */
  selectByVariant: boolean;
};

/** The current state of a select activity */
export type SelectState = {
  type: "select";
  id: string;
  parentId: string | null;
  source: SelectSource;
  /** Used to seed the random number generate to yield the actual variants of each attempt. */
  initialVariant: number;
  /** Credit achieved (between 0 and 1) over all attempts of this activity */
  creditAchieved: number;
  /** Credit achieved from the latest submission */
  latestCreditAchieved: number;
  /** The state of all possible activities that could be selected from. */
  allChildren: ActivityState[];
  /** The number of the current attempt */
  attemptNumber: number;
  /** The children selected for the current attempt  */
  selectedChildren: ActivityState[];
  /** A list of the the ids of the children selected in all attempts, ordered by attempt number */
  previousSelections: string[];
  /** The value of the question counter set for the beginning of this activity */
  initialQuestionCounter: number;
  /** See {@link RestrictToVariantSlice} */
  restrictToVariantSlice?: RestrictToVariantSlice;
};

/**
 * The current state of a select activity, where references to the source have been eliminated.
 *
 * Useful for saving to a database, as this extraneously information has been removed.
 */
export type SelectStateNoSource = Omit<
  SelectState,
  "source" | "allChildren" | "selectedChildren"
> & {
  allChildren: ActivityStateNoSource[];
  selectedChildren: ActivityStateNoSource[];
};

/** The source for creating a sequence activity */
export type SequenceSource = {
  type: "sequence";
  id: string;
  title?: string;
  /** The child activities that form the sequence. */
  items: ActivitySource[];
  /** If `true`, randomly permute the item order on each new attempt. */
  shuffle: boolean;
  /**
   * Weights given to the credit achieved of each item
   * when averaging them to determine the credit achieved of the sequence activity.
   * Items missing a weight are given the weight 1.
   */
  creditWeights?: number[];
};

/** The current state of a sequence activity, including all attempts. */
export type SequenceState = {
  type: "sequence";
  id: string;
  parentId: string | null;
  source: SequenceSource;
  /** Used to seed the random number generate to yield the actual variants of each attempt. */
  initialVariant: number;
  /** Credit achieved (between 0 and 1) over all attempts of this activity */
  creditAchieved: number;
  /** Credit achieved from the latest submission */
  latestCreditAchieved: number;
  /** The state of child activities, in their original order */
  allChildren: ActivityState[];
  /** The number of the current attempt */
  attemptNumber: number;
  /** The activities as ordered for the current attempt */
  orderedChildren: ActivityState[];
  /** See {@link RestrictToVariantSlice} */
  restrictToVariantSlice?: RestrictToVariantSlice;
};

/**
 * The current state of a sequence activity, where references to the source have been eliminated.
 *
 * Useful for saving to a database, as this extraneously information has been removed.
 */
export type SequenceStateNoSource = Omit<
  SequenceState,
  "source" | "allChildren" | "orderedChildren"
> & {
  allChildren: ActivityStateNoSource[];
  orderedChildren: ActivityStateNoSource[];
};

/**
 * A description of how to restrict the variant of a given activity.
 *
 * The `numSlices` attribute indicates how many slices the variants were broken up into.
 * The (1-indexed) `idx` attribute indicate which slice of those `numSlices` slices this activity
 * is restricted to.
 *
 * The typical case is that `numSlices` equals the number of variants for this activity,
 * so each slice contains just a single variant.
 */
export type RestrictToVariantSlice = { idx: number; numSlices: number };

/**
 * The activity state packaged for saving to a database.
 *
 * The `sourceHash` is a hash of the source (which has been removed from `state`),
 * which will be used to verify that the state matches the current source
 * when loading in the state.
 */
export type ExportedActivityState = {
  activityState: ActivityStateNoSource;
  doenetStates: unknown[];
  itemAttemptNumbers: number[];
  sourceHash: string;
};

export type ReportStateMessage = {
  subject: "SPLICE.reportScoreAndState";
  message_id: string;
  activity_id: string;
  score: number;
  item_scores: {
    id: string;
    score: number;
    docId: string;
    shuffledOrder: number;
    variant: number;
  }[];
  item_updated?: number;
  state: ExportedActivityState;
  new_attempt?: boolean;
  new_attempt_for_item?: number;
  new_doenet_state_idx?: number;
};

// type guards

export function isActivitySource(obj: unknown): obj is ActivitySource {
  return isSingleDocSource(obj) || isSelectSource(obj) || isSequenceSource(obj);
}

export function isSingleDocSource(obj: unknown): obj is SingleDocSource {
  const typedObj = obj as SingleDocSource;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    typedObj.type === "singleDoc" &&
    typeof typedObj.id === "string" &&
    typeof typedObj.isDescription === "boolean" &&
    typeof typedObj.doenetML === "string" &&
    typeof typedObj.version === "string"
  );
}

export function isSelectSource(obj: unknown): obj is SelectSource {
  const typedObj = obj as SelectSource;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    typedObj.type === "select" &&
    typeof typedObj.id === "string" &&
    typeof typedObj.numToSelect === "number" &&
    typeof typedObj.selectByVariant === "boolean" &&
    Array.isArray(typedObj.items) &&
    typedObj.items.every(isActivitySource)
  );
}

export function isSequenceSource(obj: unknown): obj is SequenceSource {
  const typedObj = obj as SequenceSource;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    typedObj.type === "sequence" &&
    typeof typedObj.id === "string" &&
    Array.isArray(typedObj.items) &&
    typedObj.items.every(isActivitySource) &&
    typeof typedObj.shuffle === "boolean" &&
    (typedObj.creditWeights === undefined ||
      (Array.isArray(typedObj.creditWeights) &&
        typedObj.creditWeights.every((weight) => typeof weight === "number")))
  );
}

export function isActivityStateNoSource(
  obj: unknown,
): obj is ActivityStateNoSource {
  return (
    isSingleDocStateNoSource(obj) ||
    isSelectStateNoSource(obj) ||
    isSequenceStateNoSource(obj)
  );
}

export function isSingleDocStateNoSource(
  obj: unknown,
): obj is SingleDocStateNoSource {
  const typedObj = obj as SingleDocStateNoSource;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    typedObj.type === "singleDoc" &&
    typeof typedObj.id === "string" &&
    (typedObj.parentId === null || typeof typedObj.parentId === "string") &&
    typeof typedObj.initialVariant === "number" &&
    typeof typedObj.creditAchieved === "number" &&
    typeof typedObj.attemptNumber === "number" &&
    typeof typedObj.currentVariant === "number" &&
    Array.isArray(typedObj.previousVariants) &&
    typedObj.previousVariants.every((x) => typeof x === "number") &&
    typeof typedObj.initialQuestionCounter === "number" &&
    (typedObj.restrictToVariantSlice === undefined ||
      isRestrictToVariantSlice(typedObj.restrictToVariantSlice))
  );
}

export function isSelectStateNoSource(
  obj: unknown,
): obj is SelectStateNoSource {
  const typedObj = obj as SelectStateNoSource;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    typedObj.type === "select" &&
    typeof typedObj.id === "string" &&
    (typedObj.parentId === null || typeof typedObj.parentId === "string") &&
    typeof typedObj.initialVariant === "number" &&
    typeof typedObj.creditAchieved === "number" &&
    Array.isArray(typedObj.allChildren) &&
    typedObj.allChildren.every(isActivityStateNoSource) &&
    typeof typedObj.attemptNumber === "number" &&
    Array.isArray(typedObj.selectedChildren) &&
    typedObj.selectedChildren.every(isActivityStateNoSource) &&
    Array.isArray(typedObj.previousSelections) &&
    typedObj.previousSelections.every((x) => typeof x === "string") &&
    typeof typedObj.initialQuestionCounter === "number" &&
    (typedObj.restrictToVariantSlice === undefined ||
      isRestrictToVariantSlice(typedObj.restrictToVariantSlice))
  );
}

export function isSequenceStateNoSource(
  obj: unknown,
): obj is SequenceStateNoSource {
  const typedObj = obj as SequenceStateNoSource;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    typedObj.type === "sequence" &&
    typeof typedObj.id === "string" &&
    (typedObj.parentId === null || typeof typedObj.parentId === "string") &&
    typeof typedObj.initialVariant === "number" &&
    typeof typedObj.creditAchieved === "number" &&
    Array.isArray(typedObj.allChildren) &&
    typedObj.allChildren.every(isActivityStateNoSource) &&
    typeof typedObj.attemptNumber === "number" &&
    Array.isArray(typedObj.orderedChildren) &&
    typedObj.orderedChildren.every(isActivityStateNoSource) &&
    (typedObj.restrictToVariantSlice === undefined ||
      isRestrictToVariantSlice(typedObj.restrictToVariantSlice))
  );
}

export function isRestrictToVariantSlice(
  obj: unknown,
): obj is RestrictToVariantSlice {
  const typeObj = obj as RestrictToVariantSlice;

  return (
    typeObj !== null &&
    typeof typeObj === "object" &&
    typeof typeObj.idx === "number" &&
    typeof typeObj.numSlices === "number"
  );
}

export function isExportedActivityState(
  obj: unknown,
): obj is ExportedActivityState {
  const typedObj = obj as ExportedActivityState;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    isActivityStateNoSource(typedObj.activityState) &&
    Array.isArray(typedObj.doenetStates) &&
    Array.isArray(typedObj.itemAttemptNumbers) &&
    typedObj.itemAttemptNumbers.every((x) => Number.isInteger(x) && x > 0) &&
    typeof typedObj.sourceHash === "string"
  );
}

export function isReportStateMessage(obj: unknown): obj is ReportStateMessage {
  const typedObj = obj as ReportStateMessage;

  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    typedObj.subject === "SPLICE.reportScoreAndState" &&
    typeof typedObj.message_id === "string" &&
    typeof typedObj.activity_id === "string" &&
    typeof typedObj.score === "number" &&
    Array.isArray(typedObj.item_scores) &&
    typedObj.item_scores.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.score === "number" &&
        typeof item.docId === "string" &&
        typeof item.shuffledOrder === "number" &&
        typeof item.variant === "number",
    ) &&
    (typedObj.item_updated === undefined ||
      typeof typedObj.item_updated === "number") &&
    isExportedActivityState(typedObj.state) &&
    (typedObj.new_attempt === undefined ||
      typeof typedObj.new_attempt === "boolean") &&
    (typedObj.new_attempt_for_item === undefined ||
      typeof typedObj.new_attempt_for_item === "number") &&
    (typedObj.new_doenet_state_idx === undefined ||
      typeof typedObj.new_doenet_state_idx === "number")
  );
}
