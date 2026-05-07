export type ApiUuid = string;

export function isApiUuid(obj: unknown): obj is ApiUuid {
  return typeof obj === "string";
}

export type Uuid = ApiUuid;

export const isUuid = isApiUuid;

export type ApiDateTime = string;

export type DoenetDateTime = ApiDateTime;

export type UserInfo = {
  userId: Uuid;
  firstNames: string | null;
  lastNames: string;
  isAnonymous?: boolean;
  numLibrary?: number;
  numCommunity?: number;
  isMaskForLibrary?: boolean;
};

export function isUserInfo(obj: unknown): obj is UserInfo {
  const typedObj = obj as UserInfo;
  return (
    typedObj !== null &&
    typeof typedObj === "object" &&
    isUuid(typedObj.userId) &&
    (typedObj.firstNames === null || typeof typedObj.firstNames === "string") &&
    typeof typedObj.lastNames === "string" &&
    (typedObj.numLibrary === undefined ||
      typeof typedObj.numLibrary === "number") &&
    (typedObj.numCommunity === undefined ||
      typeof typedObj.numCommunity === "number") &&
    (typedObj.isAnonymous === undefined ||
      typeof typedObj.isAnonymous === "boolean") &&
    (typedObj.isMaskForLibrary === undefined ||
      typeof typedObj.isMaskForLibrary === "boolean")
  );
}

export type ContentType = "singleDoc" | "select" | "sequence" | "folder";

export function isContentType(type: unknown): type is ContentType {
  return (
    typeof type === "string" &&
    ["singleDoc", "select", "sequence", "folder"].includes(type)
  );
}
