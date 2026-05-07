import { StatusCodes } from "http-status-codes";

export class InvalidRequestError extends Error {
  errorCode: StatusCodes;
  constructor(message: string, errorCode = StatusCodes.BAD_REQUEST) {
    super(message);
    this.errorCode = errorCode;

    // 👇️ because we are extending a built-in class
    Object.setPrototypeOf(this, InvalidRequestError.prototype);
  }
}

/**
 * Use this error when you want to indicate the caller did not have sufficient permissions
 * to call this endpoint, but there is alternative endpoint they could call.
 *
 * For now, just sends a 403 status.
 */
export class PermissionDeniedRedirectError extends Error {
  errorCode: StatusCodes;
  constructor(message: string) {
    super(message);
    this.errorCode = StatusCodes.FORBIDDEN;

    // 👇️ because we are extending a built-in class
    Object.setPrototypeOf(this, PermissionDeniedRedirectError.prototype);
  }
}
