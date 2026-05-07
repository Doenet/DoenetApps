import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError, z } from "zod";
import {
  InvalidRequestError,
  PermissionDeniedRedirectError,
} from "../utils/error";
import { Prisma } from "@prisma/client";

export function handleErrors(res: Response, e: unknown) {
  if (e instanceof ZodError) {
    // TODO: generate better error messages from Zod so that
    // we could reasonably display them on the front end
    //
    // Right now, we're simply passing what Zod spits out of `prettifyError`.
    // Even if we add custom error messages (see https://zod.dev/error-customization),
    // the prettify function appends info about the field where it went wrong
    // ex: ✖ Invalid email address → at email
    // No user wants to see the "→ at email" part
    // How do we take a ZodError and turn it into something displayable?

    const errorMessages = z.prettifyError(e);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Invalid data", details: errorMessages });
  } else if (e instanceof InvalidRequestError) {
    res
      .status(e.errorCode)
      .json({ error: "Invalid request", details: e.message });
  } else if (e instanceof PermissionDeniedRedirectError) {
    res.status(e.errorCode).json({
      error: "Permission denied but can redirect",
      details: e.message,
    });
  } else if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2001" || e.code === "P2003" || e.code === "P2025") {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Not found" });
    } else if (e.code === "P2002") {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
    } else {
      console.error(e);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  } else {
    console.error(e);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal Server Error" });
  }
}
