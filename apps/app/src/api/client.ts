import axios from "axios";
import {
  type ApiErrorBody,
  buildOperationRequest,
  type OperationArgs,
  type OperationName,
  type OperationResponse,
} from "@doenet-tools/shared";

/**
 * The single place the app talks HTTP to `/api`. Call operations by name;
 * params and the response are typed from the API contract:
 *
 * ```ts
 * const { assignments } = await api("getAssigned");
 * await api("updateAssignmentClosedOn", { contentId, closedOn });
 * ```
 *
 * Plain `axios` calls to `/api` are being phased out (see the lint rule and
 * its suppressions baseline); routes not yet in the contract still use them.
 */
export async function api<K extends OperationName>(
  name: K,
  ...args: OperationArgs<K>
): Promise<OperationResponse<K>> {
  const request = buildOperationRequest(name, ...args);
  try {
    const { data } = await axios.request<OperationResponse<K>>({
      method: request.method,
      url: request.url,
      params: request.query,
      data: request.body,
    });
    return data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      throw new ApiError(name, e.response.status, e.response.data, e);
    }
    throw e;
  }
}

/** A failed operation: the server answered with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly operation: OperationName,
    readonly status: number,
    readonly body: ApiErrorBody | undefined,
    cause: unknown,
  ) {
    super(
      `${operation} failed with status ${status}` +
        (body?.error ? `: ${body.error}` : ""),
      { cause },
    );
    this.name = "ApiError";
  }
}
