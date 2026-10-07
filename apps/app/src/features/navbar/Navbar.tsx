import { Hide, Show } from "@chakra-ui/react";
import { UserInfoWithEmail } from "../../types";
import { ThemeSetting } from "../../utils/theme";
import { getDiscourseUrl } from "../../utils/discourse";
import { NavbarDesktop } from "./NavbarDesktop";
import {
  mainSections,
  navAccountAnonymousUser,
  navAccountEditor,
  navAccountPublic,
  navAccountUser,
} from "./navbar.data";
import { NavSection } from "./navbar.types";
import { NavbarMobile } from "./NavbarMobile";

export function Navbar({
  user,
  themeSetting = "system",
  setThemeSetting = () => {},
}: {
  user?: UserInfoWithEmail;
  // Optional so component tests can mount <Navbar/> without theme plumbing;
  // SiteHeader always supplies the real values from useThemeSetting.
  themeSetting?: ThemeSetting;
  setThemeSetting?: (_: ThemeSetting) => void;
}) {
  const discussionsLink = getDiscourseUrl(user);

  const main = mainSections({ discussionsLink });

  let account: NavSection;
  if (!user) {
    account = navAccountPublic;
  } else if (user.isAnonymous) {
    account = navAccountAnonymousUser;
  } else if (user.isEditor) {
    account = navAccountEditor(user.userId);
  } else {
    account = navAccountUser(user.userId);
  }

  return (
    <>
      <Hide below="lg">
        <NavbarDesktop
          mainSections={main}
          accountSection={account}
          user={user}
          themeSetting={themeSetting}
          setThemeSetting={setThemeSetting}
        />
      </Hide>
      <Show below="lg">
        <NavbarMobile
          sections={[...main, account]}
          user={user}
          themeSetting={themeSetting}
          setThemeSetting={setThemeSetting}
        />
      </Show>
    </>
  );
}
