/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "passport-magic-link" {
  import { Strategy as PassportStrategy } from "passport-strategy";
  import { Request } from "express";

  // Options interface for the MagicLinkStrategy
  interface MagicLinkStrategyOptions {
    secret: string;
    userFields: string[];
    tokenField: string;
    ttl?: number;
    passReqToCallbacks?: boolean;
    verifyUserAfterToken?: boolean;
    storage?: TokenStorage;
    allowReuse?: boolean;
    userPrimaryKey?: string;
    tokenAlreadyUsedMessage?: string;
  }

  // Interface for the token storage
  interface TokenStorage {
    store: (key: string, value: string, ttl: number) => Promise<void>;
    retrieve: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  }

  // Callback function type for sending token
  type SendTokenCallback = (
    user: any,
    token: string,
    req?: Request,
  ) => Promise<void>;

  // Callback function type for verifying user
  type VerifyUserCallback = (userOrReq: any, userFields?: any) => any;

  // The MagicLinkStrategy class
  export class Strategy extends PassportStrategy {
    constructor(
      options: MagicLinkStrategyOptions,
      sendToken: SendTokenCallback,
      verifyUser: VerifyUserCallback,
    );

    authenticate(req: Request, options?: object): void;
  }
}

// allow magiclink-specific options when using "google" strategy
declare module "passport" {
  interface AuthenticateOptions {
    action?: string;
    userPrimaryKey?: string;
  }

  interface Authenticator {
    authenticate(
      strategy: "magiclink",
      options: { action: string },
      callback?: (...args: any[]) => any,
    ): any;
    authorize(
      strategy: "magiclink",
      options: { action: string },
      callback?: (...args: any[]) => any,
    ): any;
  }
}
