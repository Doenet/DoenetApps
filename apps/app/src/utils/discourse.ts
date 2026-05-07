import { SiteContext } from "../paths/SiteHeader";

export function getDiscourseUrl(user: SiteContext["user"]) {
  return `${import.meta.env.VITE_DISCOURSE_URL}${
    user && user?.isAnonymous === false ? "/session/sso" : ""
  }`;
}
