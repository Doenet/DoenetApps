import { useEffect, useRef, useState } from "react";
import { Grid, GridItem, SkipNavLink, SkipNavContent } from "@chakra-ui/react";
import { Outlet, useLoaderData, useLocation } from "react-router";
import axios from "axios";
import {
  ContentDescription,
  DoenetmlVersion,
  License,
  UserInfoWithEmail,
} from "../types";
import { Navbar } from "../features/navbar";

const navBarHeight = "40px";

export type SiteContext = {
  user?: UserInfoWithEmail;
  exploreTab: number | null;
  setExploreTab: (_: number | null) => void;
  addTo: ContentDescription | null;
  setAddTo: (_: ContentDescription | null) => void;
  allLicenses: License[];
  allDoenetmlVersions: DoenetmlVersion[];
  mainRef: React.RefObject<HTMLDivElement | null>;
};

export async function loader() {
  const {
    data: { user },
  } = await axios.get("/api/user/getMyUserInfo");

  const {
    data: { allLicenses },
  } = await axios.get("/api/info/getAllLicenses");

  const {
    data: { allDoenetmlVersions },
  } = await axios.get("/api/info/getAllDoenetmlVersions");

  return { user, allLicenses, allDoenetmlVersions };
}

/**
 * Main site header component that provides responsive navigation.
 * Renders a horizontal navbar on desktop (lg+) with dropdown menus,
 * and a hamburger menu with drill-down navigation on mobile.
 * Includes skip navigation link for accessibility.
 */
function ScrollToTop({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname, scrollRef]);

  return null;
}

export function SiteHeader() {
  const { user, allLicenses, allDoenetmlVersions } = useLoaderData() as {
    user?: UserInfoWithEmail;
    allLicenses: License[];
    allDoenetmlVersions: DoenetmlVersion[];
  };

  const [exploreTab, setExploreTab] = useState<number | null>(null);

  const [addTo, setAddTo] = useState<ContentDescription | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);

  const siteContext: SiteContext = {
    user,
    exploreTab,
    setExploreTab,
    addTo,
    setAddTo,
    allLicenses,
    allDoenetmlVersions,
    mainRef,
  };

  return (
    <>
      <SkipNavLink zIndex="2000">Skip to content</SkipNavLink>
      <Grid
        templateAreas={`"siteHeader"
        "main"`}
        gridTemplateRows={`${navBarHeight} auto`}
        width="100vw"
        height="100vh"
      >
        <GridItem
          as="header"
          area="siteHeader"
          width="100vw"
          m="0"
          h={navBarHeight}
        >
          <Navbar user={user} />
        </GridItem>
        <GridItem
          ref={mainRef}
          as="main"
          area="main"
          margin="0"
          overflowY="auto"
          data-test="Main Content"
        >
          <SkipNavContent />
          <ScrollToTop scrollRef={mainRef} />
          <Outlet context={siteContext} />
        </GridItem>
      </Grid>
    </>
  );
}
