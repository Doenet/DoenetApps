import { Spinner } from "@chakra-ui/react";
import { FetcherWithComponents } from "react-router";

/**
 * Return the optimistic value of some field using a fetcher's recently submitted data.
 * If there is a pending fetch request to update some value, this function will return the new updating value.
 * Otherwise, this function returns the regular ground truth value.
 *
 * Use this when:
 * - You are using `fetcher.submit` to POST some request
 * - That post request is encoded as `application/json`, not the default `multipart/form-data`
 * - The fetcher is only used for this particular submission.
 *
 * @param fetcher the fetcher you use to `fetcher.submit()`
 * @param fieldName the field in the POST request to use
 * @param groundTruthValue the backup value if there is no optimistic value
 *
 */
export function optimistic<T>(
  fetcher: FetcherWithComponents<T>,
  fieldName: string,
  groundTruthValue: T,
): T {
  let optimisticValue = groundTruthValue;
  if (fetcher.state !== "idle") {
    const jsonObject = fetcher.json! as JsonObject;
    if (jsonObject[fieldName] === undefined) {
      throw Error(`Fetcher json supposed to contain field ${fieldName}`);
    }
    optimisticValue = jsonObject[fieldName] as T;
  }
  return optimisticValue;
}

/**
 * A circular spinner that only appears when
 * a `fetcher` is not idle.
 * @param state the `fetcher.state`
 */
export function SpinnerWhileFetching({
  state,
}: {
  state: "idle" | "loading" | "submitting";
}) {
  if (state !== "idle") {
    return <Spinner size="sm" />;
  } else {
    return null;
  }
}

// These types are copied from types React Router's fetcher uses.
// We just need them to tell typescript about json.
type JsonObject = {
  [Key in string]: JsonValue;
};
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
