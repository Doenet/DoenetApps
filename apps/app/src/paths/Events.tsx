import { useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
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

            {/* Virtual Workshop Reunion */}
            <Box w="100%">
              <Heading size="lg" mb={3}>
                <ChakraLink
                  href="https://luma.com/jej9sscb"
                  isExternal
                  textDecoration="underline"
                >
                  Doenet workshop reunion
                </ChakraLink>
              </Heading>

              <VStack align="start" spacing={3}>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  We are crashing the beginning of Doenet office hours to have a
                  reunion for participants from our June Doenet community
                  workshop! Stop by to reconnect with the cool people you met at
                  the workshop, get support on your Doenet projects, and share
                  what you've been working on.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Dates:</strong> Tuesday, June 23, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 2–3pm Eastern, 11am–noon Pacific
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
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://luma.com/jej9sscb"
                    colorScheme="blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Register at Luma
                  </Button>
                </Text>
              </VStack>
            </Box>

            {/* Training Workshops Section */}
            <Box w="100%" id="workshops">
              <Heading size="lg" mb={3} mt={5}>
                Virtual training workshops
              </Heading>

              <VStack
                align="start"
                spacing={3}
                mb={6}
                pl={4}
                borderLeft="3px solid"
                borderColor="border"
              >
                <Heading size="md">
                  <ChakraLink
                    href="https://scholarlattice.org/collections/f35e07c6-acc2-4b79-9ffd-f9cd8eada6cb"
                    isExternal
                    textDecoration="underline"
                  >
                    June Doenet Virtual Workshop
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this 4-day virtual workshop held on Zoom, participants will
                  learn how to create accessible, dynamic and interactive
                  activities in Doenet. The workshop will also provide guidance
                  on using the available resources to learn more about Doenet,
                  including how to connect with the supportive Doenet community
                  of developers and experienced instructors.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Monday June 15 through Thursday June
                  18, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 1–4pm Eastern, 10am–1pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/f35e07c6-acc2-4b79-9ffd-f9cd8eada6cb"
                    colorScheme="blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Details and registration at ScholarLattice
                  </Button>
                </Text>
              </VStack>

              <VStack
                align="start"
                spacing={3}
                mb={6}
                pl={4}
                borderLeft="3px solid"
                borderColor="border"
              >
                <Heading size="md">
                  <ChakraLink
                    href="https://scholarlattice.org/collections/71068412-a9df-4431-ad59-6e9759814792"
                    isExternal
                    textDecoration="underline"
                  >
                    Getting Started with GitHub
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this 2-hour virtual workshop held on Zoom, participants
                  will learn how to use GitHub to contribute to open-source
                  projects like Doenet. The workshop will be based on the
                  material from{" "}
                  <ChakraLink
                    href="https://g4m.code4math.org/g4m.html"
                    isExternal
                    textDecoration="underline"
                  >
                    GitHub for Mathematicians
                  </ChakraLink>
                  .
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Tuesday, June 23, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 3–5pm Eastern, noon–2pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/71068412-a9df-4431-ad59-6e9759814792"
                    colorScheme="blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Details and registration at ScholarLattice
                  </Button>
                </Text>
              </VStack>

              <VStack
                align="start"
                spacing={3}
                mb={6}
                pl={4}
                borderLeft="3px solid"
                borderColor="border"
              >
                <Heading size="md">
                  <ChakraLink
                    href="https://scholarlattice.org/collections/eef2f028-25cc-42d8-9915-6b7438df42aa"
                    isExternal
                    textDecoration="underline"
                  >
                    Intro to Doenet Development
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this 2-hour virtual workshop held on Zoom, participants
                  will learn how to contribute to the software behind Doenet.
                  The workshop assumes some basic familiarity with GitHub, such
                  as covered in our{" "}
                  <ChakraLink
                    href="https://scholarlattice.org/collections/71068412-a9df-4431-ad59-6e9759814792"
                    isExternal
                    textDecoration="underline"
                  >
                    Getting Started with GitHub workshop
                  </ChakraLink>
                  . Participants will learn how to set up a local development
                  environment, understand the structure of the Doenet codebase,
                  and get guidance on how to find and work on issues.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Thursday, June 25, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 2–4pm Eastern, 11am–1pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/eef2f028-25cc-42d8-9915-6b7438df42aa"
                    colorScheme="blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Details and registration at ScholarLattice
                  </Button>
                </Text>
              </VStack>

              <VStack
                align="start"
                spacing={3}
                mb={6}
                pl={4}
                borderLeft="3px solid"
                borderColor="border"
              >
                <Heading size="md">
                  <ChakraLink
                    href="https://scholarlattice.org/collections/2ed44057-3e32-43de-90af-ad1e3806175e"
                    isExternal
                    textDecoration="underline"
                  >
                    July Doenet Virtual Workshop
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this 4-day virtual workshop held on Zoom, participants will
                  learn how to create accessible, dynamic and interactive
                  activities in Doenet. The workshop will also provide guidance
                  on using the available resources to learn more about Doenet,
                  including how to connect with the supportive Doenet community
                  of developers and experienced instructors.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Tuesday July 14 through Friday July 17,
                  2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 3–6pm Eastern, noon–3pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/2ed44057-3e32-43de-90af-ad1e3806175e"
                    colorScheme="blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Details and registration at ScholarLattice
                  </Button>
                </Text>
              </VStack>
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
                Part B: Friday, August 7, 10:00 am – 11:50 am
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
