import type {
  OperationArgs,
  OperationName,
  OperationParams,
} from "@doenet-tools/shared";
import type { FetcherWithComponents, SubmitFunction } from "react-router";

/** What `genericAction` should do after the operation succeeds. */
export type SubmitOperationOptions = {
  redirectOnSuccess?: string;
  replaceOnSuccess?: string;
  redirectNewContentId?: boolean;
};

/**
 * Call an API operation through the current route's `genericAction`, so
 * React Router revalidates loaders afterwards. Typed like `api()`.
 *
 * ```ts
 * submitOperation(fetcher, "updateAssignmentSettings", { contentId, mode });
 * ```
 */
export function submitOperation<K extends OperationName>(
  submitter: Pick<FetcherWithComponents<unknown>, "submit"> | SubmitFunction,
  name: K,
  ...[params, options]: [...OperationArgs<K>, SubmitOperationOptions?]
) {
  const payload: OperationSubmission = {
    operation: name,
    params: (params ?? {}) as OperationParams<K>,
    ...options,
  };
  const submit = typeof submitter === "function" ? submitter : submitter.submit;
  // Params are JSON by construction (they come from the API contract).
  return submit(payload as unknown as Parameters<SubmitFunction>[0], {
    method: "post",
    encType: "application/json",
  });
}

/** The JSON `submitOperation` sends to `genericAction`. */
export type OperationSubmission = {
  operation: OperationName;
  params: Record<string, unknown>;
} & SubmitOperationOptions;
