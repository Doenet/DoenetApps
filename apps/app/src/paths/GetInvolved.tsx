import { useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { WithSideBanners } from "../layout/WithSideBanners";

export function GetInvolved() {
  useEffect(() => {
    document.title = `Get Involved - Doenet`;
  }, []);

  return (
    <>
      <WithSideBanners bgColor="background">
        <Box
          p="40px"
          w="100%"
          // Hack: ensure background color extends full height
          // Remove once we implement background color globally
          minH="calc(100vh - 40px)"
        >
          <Heading size="lg">Get involved with Doenet</Heading>

          <VStack align="start" spacing={8} mt={6}>
            <Text fontSize="1.3rem" lineHeight="1.3">
              There are many ways to get involved with Doenet. Just by writing
              activities on{" "}
              <ChakraLink
                href="https://beta.doenet.org"
                isExternal
                textDecoration="underline"
              >
                Doenet
              </ChakraLink>{" "}
              and sharing them publicly, you are contributing to the content
              that we can all use.
            </Text>

            <Text fontSize="1.3rem" lineHeight="1.3">
              If you'd like more specific ways to contribute, you are welcome to
              get involved with these groups.
            </Text>

            {/* Documentation Group */}
            <Box w="100%">
              <Heading size="md" mb={3}>
                Documentation Group
              </Heading>
              <VStack align="start" spacing={2}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  The documentation group writes and updates our{" "}
                  <ChakraLink
                    href="https://docs.doenet.org"
                    isExternal
                    textDecoration="underline"
                  >
                    documentation
                  </ChakraLink>{" "}
                  for people getting started with Doenet. The documentation is a
                  work in progress, and we welcome any contributions, small or
                  large, toward improving it!
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  To get involved, check out the{" "}
                  <ChakraLink
                    href="https://community.doenet.org/tag/documentation"
                    isExternal
                    textDecoration="underline"
                  >
                    documentation discussions
                  </ChakraLink>{" "}
                  or email{" "}
                  <ChakraLink
                    href="mailto:docs@doenet.org"
                    textDecoration="underline"
                  >
                    docs@doenet.org
                  </ChakraLink>
                  .
                </Text>
                <Text fontStyle="italic" fontSize="1rem">
                  Documentation group members: Virginia Mae, Jon Rogness
                </Text>
              </VStack>
            </Box>

            {/* Curriculum Group */}
            <Box w="100%">
              <Heading size="md" mb={3}>
                Curriculum Group
              </Heading>
              <VStack align="start" spacing={2}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  The curriculum group helps shepherd the development of the
                  content on{" "}
                  <ChakraLink
                    href="https://beta.doenet.org"
                    isExternal
                    textDecoration="underline"
                  >
                    Doenet
                  </ChakraLink>
                  . They help organize groups of authors working on different
                  topics, curate content for{" "}
                  <ChakraLink
                    href="https://beta.doenet.org/explore"
                    isExternal
                    textDecoration="underline"
                  >
                    library section
                  </ChakraLink>
                  , and develop our content classification system.
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  To get involved, check out the{" "}
                  <ChakraLink
                    href="https://community.doenet.org/tag/curriculum"
                    isExternal
                    textDecoration="underline"
                  >
                    curriculum discussions
                  </ChakraLink>{" "}
                  or email{" "}
                  <ChakraLink
                    href="mailto:curriculum@doenet.org"
                    textDecoration="underline"
                  >
                    curriculum@doenet.org
                  </ChakraLink>
                  .
                </Text>
                <Text fontStyle="italic" fontSize="1rem">
                  Curriculum group members: Kris Hollingsworth, Anurag Katyal,
                  Oscar Levin, Virginia Mae, Jon Rogness, Mike Weimerskirch
                </Text>
              </VStack>
            </Box>

            {/* Training Group */}
            <Box w="100%">
              <Heading size="md" mb={3}>
                Training Group
              </Heading>
              <VStack align="start" spacing={2}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  The training group helps people get started with using Doenet,
                  with a particular focus in helping people write content. The
                  group responds to author questions, hosts online office hours,
                  and organizes training workshops.
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  To get involved, check out the{" "}
                  <ChakraLink
                    href="https://community.doenet.org/tag/training"
                    isExternal
                    textDecoration="underline"
                  >
                    training discussions
                  </ChakraLink>{" "}
                  or email{" "}
                  <ChakraLink
                    href="mailto:training@doenet.org"
                    textDecoration="underline"
                  >
                    training@doenet.org
                  </ChakraLink>
                  .
                </Text>
                <Text fontStyle="italic" fontSize="1rem">
                  Training group members: Anurag Katyal, Melissa Lynn, Virginia
                  Mae, Duane Nykamp, Ozlem Ugurlu, Mike Weimerskirch
                </Text>
              </VStack>
            </Box>

            {/* Communications Group */}
            <Box w="100%">
              <Heading size="md" mb={3}>
                Communications Group
              </Heading>
              <VStack align="start" spacing={2}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  Interested in telling others about Doenet? Join our
                  communications group, and help us write blog entries, social
                  media posts, and/or a newsletter.
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  To get involved, check out the{" "}
                  <ChakraLink
                    href="https://community.doenet.org/tag/communications"
                    isExternal
                    textDecoration="underline"
                  >
                    communications discussions
                  </ChakraLink>{" "}
                  or email{" "}
                  <ChakraLink
                    href="mailto:communications@doenet.org"
                    textDecoration="underline"
                  >
                    communications@doenet.org
                  </ChakraLink>
                  .
                </Text>
                <Text fontStyle="italic" fontSize="1rem">
                  Communication group members: Melissa Lynn, Charles Nykamp, Jon
                  Rogness
                </Text>
              </VStack>
            </Box>

            {/* Software Group */}
            <Box w="100%">
              <Heading size="md" mb={3}>
                Software Group
              </Heading>
              <VStack align="start" spacing={2}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  The software group develops the software for the Doenet
                  website and the language used to write Doenet activities,
                  called DoenetML (Doenet Markup Language). You can help the
                  software group by creating bug reports (called Issues) on our{" "}
                  <ChakraLink
                    href="https://github.com/Doenet/DoenetTools/issues"
                    isExternal
                    textDecoration="underline"
                  >
                    GitHub site
                  </ChakraLink>{" "}
                  or finding an issue that you can help fix.
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  To get involved, check out our{" "}
                  <ChakraLink
                    href="https://github.com/orgs/Doenet/discussions"
                    isExternal
                    textDecoration="underline"
                  >
                    GitHub
                  </ChakraLink>{" "}
                  or email{" "}
                  <ChakraLink
                    href="mailto:dev@doenet.org"
                    textDecoration="underline"
                  >
                    dev@doenet.org
                  </ChakraLink>
                  .
                </Text>
                <Text fontStyle="italic" fontSize="1rem">
                  Software group members: Melissa Lynn, Charles Nykamp, Duane
                  Nykamp, Jason Siefken
                </Text>
              </VStack>
            </Box>

            {/* Accessibility Group */}
            <Box w="100%">
              <Heading size="md" mb={3}>
                Accessibility Group
              </Heading>
              <VStack align="start" spacing={2}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  The accessibility group works to make sure that Doenet is
                  accessible to all. They test the accessibility of the Doenet
                  website and activities, and they work to improve the way users
                  using assistive technology can interact with the content.
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  To get involved, check out the{" "}
                  <ChakraLink
                    href="https://community.doenet.org/tag/accessibility"
                    isExternal
                    textDecoration="underline"
                  >
                    accessibility discussions
                  </ChakraLink>{" "}
                  or email{" "}
                  <ChakraLink
                    href="mailto:accessibility@doenet.org"
                    textDecoration="underline"
                  >
                    accessibility@doenet.org
                  </ChakraLink>
                  .
                </Text>
                <Text fontStyle="italic" fontSize="1rem">
                  Accessibility group members: Virginia Mae, Duane Nykamp
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </WithSideBanners>
    </>
  );
}
