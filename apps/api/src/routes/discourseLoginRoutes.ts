import express, { Request, Response } from "express";
import base64url from "base64url";
import crypto from "crypto";
import { prisma } from "../model";

export const discourseRouter = express.Router();

function hmacSha256Hex(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function extractRawParams(url: string): { sso: string; sig: string } {
  const rawQuery = url.split("?")[1];
  if (!rawQuery) throw new Error("No query string found");

  // The regex ([^&]+) captures until the next & or end of string
  const ssoMatch = rawQuery.match(/sso=([^&]+)/)?.[1];
  const sigMatch = rawQuery.match(/sig=([^&]+)/)?.[1];

  if (!ssoMatch || !sigMatch) {
    throw new Error("Missing sso or sig in query string");
  }

  return { sso: ssoMatch, sig: sigMatch };
}

discourseRouter.get("/sso", async (req: Request, res: Response) => {
  if (!process.env.DISCOURSE_SSO_SECRET) {
    console.log("DISCOURSE_SSO_SECRET not configured");
    res.status(500).send("SSO secret not configured");
    return;
  }

  try {
    // 1. Extract raw sso and sig from the query string WITHOUT decoding
    const { sso: rawSso, sig } = extractRawParams(req.originalUrl);

    // 2. URL-decode the SSO parameter
    // Discourse signs the Base64 payload, not the URL encoding of it — so you must URL-decode exactly once, then verify the HMAC.

    const sso = decodeURIComponent(rawSso);

    // 3. Verify HMAC signature on URL-decoded SSO
    const expectedSig = hmacSha256Hex(sso, process.env.DISCOURSE_SSO_SECRET);
    if (expectedSig !== sig) {
      res.status(400).send("Bad sig");
      return;
    }

    // 4. Decode the Base64 payload
    const decodedPayload = base64url.decode(sso);
    const payloadParams = new URLSearchParams(decodedPayload);
    const nonce = payloadParams.get("nonce");
    const returnUrl = payloadParams.get("return_sso_url");

    if (!nonce || !returnUrl) {
      return res.status(400).send("Missing nonce or return_sso_url");
    }

    // 5. Check if user is logged in
    if (!req.isAuthenticated?.() || !req.user) {
      return res.redirect(
        "/signIn?returnTo=" + encodeURIComponent(req.originalUrl),
      );
    }

    // 6. Fetch user info
    const { email, firstNames, lastNames } =
      await prisma.users.findUniqueOrThrow({
        where: { userId: req.user.userId },
        select: { email: true, firstNames: true, lastNames: true },
      });

    if (!email) {
      return res.status(400).send("Invalid account type");
    }

    // 7. Build response paylod in a format Discourse expects
    // TODO: Does Discourse allow duplicate usernames? If not, need to ensure uniqueness,
    // possibly by adding random digits at the end
    const username = `${firstNames}_${lastNames}`;
    const name = `${firstNames} ${lastNames}`;

    const responsePayload = new URLSearchParams({
      nonce,
      external_id: req.user.userId.toString(),
      email,
      username,
      name,
      // Optionally add avatar_url
    }).toString();

    // 8. Encode and sign response
    const ssoResponse = base64url.encode(responsePayload);
    const responseSig = hmacSha256Hex(
      ssoResponse,
      process.env.DISCOURSE_SSO_SECRET,
    );

    // 9. Redirect back to Discourse
    res.redirect(
      `${returnUrl}?sso=${encodeURIComponent(ssoResponse)}&sig=${responseSig}`,
    );
  } catch (error) {
    console.error("Error in Discourse SSO:", error);
    return res.redirect("/");
  }
});
