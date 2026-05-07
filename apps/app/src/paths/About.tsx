import { useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link as ChakraLink,
  Image,
  Flex,
} from "@chakra-ui/react";
import { Link as ReactRouterLink, useOutletContext } from "react-router";
import { SiteContext } from "./SiteHeader";
import { getDiscourseUrl } from "../utils/discourse";
import { WithSideBanners } from "../layout/WithSideBanners";

export function About() {
  useEffect(() => {
    document.title = `About - Doenet`;
  }, []);

  const { user } = useOutletContext<SiteContext>();
  const discussHref = getDiscourseUrl(user);

  return (
    <WithSideBanners bgColor="background">
      <Box
        p="40px"
        w="100%"
        // Hack: ensure background color extends full height
        // Remove once we implement background color globally
        minH="calc(100vh - 40px)"
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "center", md: "flex-start" }}
          justify="flex-start"
          gap={{ base: "16px", md: "32px" }}
          w="100%"
        >
          <Box
            flex="1 1 0"
            maxW={{ md: "780px" }}
            order={{ base: 2, md: 1 }}
            mb="60px"
          >
            <Heading size="lg">About Doenet</Heading>

            <Text fontSize="1.3rem" lineHeight="1.3" mt="16px">
              Doenet is a community of STEM instructors and authors who strive
              to engage students&apos; minds and spur active interaction with
              mathematical ideas. We work together to develop open source tools
              that enable anyone to create exploratory activities with feedback.
            </Text>
            <Text fontSize="1.3rem" lineHeight="1.3" mt="16px">
              Doenet and content created with Doenet will always be freely
              available.
            </Text>
          </Box>
          <Box flex="0 0 auto" order={{ base: 1, md: 2 }}>
            <Image
              src="/Doenet_Logo_Frontpage.png"
              alt="Doenet Logo"
              maxWidth={{ base: "220px", md: "260px" }}
              height="auto"
            />
          </Box>
        </Flex>
        {/* What You Can Do Section */}
        <VStack align="flex-start" spacing="10px" w="100%">
          <Heading size="md">What you can do</Heading>
          <Box display="flex" gap="12px" flexWrap="wrap">
            <CustomButton label="Explore existing content" to="/explore" />
            <CustomButton label="How to get involved" to="/get-involved" />
            <CustomButton
              label="Start authoring"
              to="https://docs.doenet.org"
            />
          </Box>
        </VStack>

        <VStack align="flex-start" spacing="10px" w="100%" mt="40px">
          <Heading size="md">Get in touch</Heading>
          <Box display="flex" gap="12px" flexWrap="wrap">
            <CustomButton label="Community discussions" to={discussHref} />
            {/* <CustomButton label="Events" to="/events" /> */}
          </Box>
        </VStack>
      </Box>
    </WithSideBanners>
  );
}

function CustomButton({ label, to }: { label: string; to: string }) {
  return (
    <ChakraLink
      as={ReactRouterLink}
      to={to}
      fontSize="1.1rem"
      textDecoration="none"
      bg="surface"
      borderColor="border"
      borderWidth="1px"
      borderStyle="solid"
      px="12px"
      py="8px"
      borderRadius="md"
      _hover={{ bg: "interact", boxShadow: "sm" }}
    >
      {label}
    </ChakraLink>
  );
}
