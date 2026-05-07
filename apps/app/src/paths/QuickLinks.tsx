import { useEffect } from "react";
import { Heading, Text, Link as ChakraLink, VStack } from "@chakra-ui/react";
import { Link as ReactRouterLink, useOutletContext } from "react-router";
import { SiteContext } from "./SiteHeader";
import { getDiscourseUrl } from "../utils/discourse";
import { WithSideBanners } from "../layout/WithSideBanners";

const StyledLink = ({
  children,
  ...props
}: React.ComponentProps<typeof ReactRouterLink>) => (
  <Text pl="24px" fontSize="lg" textDecoration="underline">
    <ChakraLink as={ReactRouterLink} {...props}>
      {children}
    </ChakraLink>
  </Text>
);

export function QuickLinks() {
  useEffect(() => {
    document.title = `Links - Doenet`;
  }, []);

  const { user } = useOutletContext<SiteContext>();
  const discussHref = getDiscourseUrl(user);

  return (
    <WithSideBanners bgColor="background">
      <VStack
        p="40px"
        w="100%"
        alignItems="start"
        spacing="16px"
        // Hack: ensure background color extends full height
        // Remove once we implement background color globally
        minH="calc(100vh - 40px)"
      >
        <Heading size="lg">Links</Heading>

        <Heading size="md">General</Heading>
        <StyledLink to="https://forms.gle/wSqsd8v355mj3GBH8">
          Sign up to receive email updates
        </StyledLink>
        <StyledLink to="/events">Upcoming events and workshops</StyledLink>

        <Heading size="md">Authoring resources</Heading>
        <StyledLink to="/scratchPad">Scratch pad</StyledLink>
        <StyledLink to="https://docs.doenet.org/">Documentation</StyledLink>

        <Heading size="md">Authoring support</Heading>
        <StyledLink to={discussHref}>Community discussions</StyledLink>
        <StyledLink to="https://mathtech.org/dropin">
          Office hours (Zoom link)
        </StyledLink>

        <Heading size="md">Social</Heading>
        <StyledLink to="https://www.facebook.com/groups/1592878455245652">
          Facebook
        </StyledLink>
        <StyledLink to="https://discord.gg/PUduwtKJ5h">Discord</StyledLink>
        <StyledLink to="/blog">Blog</StyledLink>

        <Heading size="md">Community</Heading>
        <StyledLink to="/get-involved">Get Involved</StyledLink>
        <StyledLink to="/about">About Doenet</StyledLink>

        <Heading size="md">Software developers</Heading>
        <StyledLink to="https://github.com/Doenet">
          GitHub (Doenet organization)
        </StyledLink>
        <StyledLink to="https://github.com/Doenet/DoenetML">
          GitHub (DoenetML)
        </StyledLink>
        <StyledLink to="https://github.com/Doenet/DoenetTools">
          GitHub (web app)
        </StyledLink>
      </VStack>
    </WithSideBanners>
  );
}
