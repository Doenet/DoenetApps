import { useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { WithSideBanners } from "../layout/WithSideBanners";

export function Events() {
  useEffect(() => {
    document.title = `Events - Doenet`;
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
          <Heading size="xl" mb={6}>
            Events
          </Heading>

          <VStack align="start" spacing={8}>
            {/* Virtual Office Hours Section */}
            <Box w="100%">
              <Heading size="lg" mb={3}>
                Virtual office hours
              </Heading>
              <VStack align="start" spacing={3}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  Join us for office hours to ask questions, get support, and
                  connect with the Doenet community. All are welcome!
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  Drop in anytime during the two hours.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Dates:</strong> Tuesdays
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 2–4pm Eastern, 11am–1pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Location:</strong> Online, via Zoom. Link:{" "}
                  <ChakraLink
                    href="https://mathtech.org/dropin"
                    isExternal
                    textDecoration="underline"
                  >
                    https://mathtech.org/dropin
                  </ChakraLink>
                </Text>
              </VStack>
            </Box>

            {/* Training Workshops Section */}
            <Box w="100%" id="workshops">
              <Heading size="lg" mb={3} mt={5}>
                Virtual training workshops
              </Heading>

              <p>
                Email <a href="mailto:info@doenet.org">info@doenet.org</a> to
                inquire about any upcoming virtual training workshops.
              </p>
            </Box>

            {/* In-person Workshops and Conferences Section */}
            <Box w="100%">
              <Heading size="lg" mb={3} mt={5}>
                In-person workshops and conferences
              </Heading>

              <Text fontSize="1.3rem" lineHeight="1.3" mb={6}>
                Doenet will be at the following workshops and conferences. We
                hope to see you there!
              </Text>

              <VStack
                align="start"
                spacing={3}
                pl={4}
                borderLeft="3px solid"
                borderColor="border"
              >
                <Heading size="md">MathFest Minicourse</Heading>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Title:</strong> Upgrading Online Assignments: Building
                  Scaffolded Activities for Conceptual Understanding
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Part A:</strong> Thursday, August 6, 8:00 am – 9:50 am
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Part B:</strong> Friday, August 7, 10:00 am – 11:50 am
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Location:</strong> Boston, MA
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  Do your students get perfect scores on autograded homework
                  only to demonstrate poor learning on in-class assessments?
                  What if, rather than just seeing the correctness of their
                  single answer, students received feedback throughout the
                  process, helping them discover the solution and develop
                  conceptual understanding? In this minicourse, you will learn
                  how to create interactive online mathematics activities that
                  guide students to discover how to solve a problem. (See more
                  details in the{" "}
                  <ChakraLink
                    href="https://maa.org/events/mathfest-program/minicourses/"
                    isExternal
                    textDecoration="underline"
                  >
                    MathFest program
                  </ChakraLink>
                  .)
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  Register for the minicourse as part of your{" "}
                  <ChakraLink
                    href="https://web.cvent.com/event/ad822b5c-1850-4215-a691-11fd7c371828/summary"
                    isExternal
                    textDecoration="underline"
                  >
                    MathFest registration
                  </ChakraLink>
                  .
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </WithSideBanners>
    </>
  );
}
