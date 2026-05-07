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
                    href="https://scholarlattice.org/collections/b8ec4af3-8f71-4e4a-b86e-838242e47058"
                    isExternal
                    textDecoration="underline"
                  >
                    Intro to Doenet
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this workshop, participants will be introduced to the free
                  and open-source platform Doenet. They will learn about the key
                  constructs of Doenet and learn how to create Doenet activities
                  with basic answer validation.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Tuesday, May 5, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 5–7pm Eastern, 2pm–4pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/b8ec4af3-8f71-4e4a-b86e-838242e47058"
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
                    href="https://scholarlattice.org/collections/2b79369a-6c1b-47c1-b711-b21ec556c27a"
                    isExternal
                    textDecoration="underline"
                  >
                    Randomized Problem Versions and Doenet Assignments
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this workshop, participants will be introduced to Doenet
                  features for generating randomized versions of problems and
                  assigning activities to students. In addition, the workshop
                  will include practical pedagogical considerations for creating
                  effective problem versions.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Tuesday, May 12, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 5–7pm Eastern, 2pm–4pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/2b79369a-6c1b-47c1-b711-b21ec556c27a"
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
                    href="https://scholarlattice.org/collections/f4655dd4-90fd-41ac-b9dd-b496271b6c3b"
                    isExternal
                    textDecoration="underline"
                  >
                    Graphs in Doenet
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this workshop, participants will learn how to create graphs
                  in Doenet. They will learn how to use Doenet features to
                  create figures such as lines, circles, polygons, and graphs of
                  functions. They will learn how to link objects together (e.g.,
                  a point on a line, or referencing a point outside of a graph),
                  as a preview of more sophisticated interactivity.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Tuesday, May 19, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 5–7pm Eastern, 2pm–4pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/f4655dd4-90fd-41ac-b9dd-b496271b6c3b"
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
                    href="https://scholarlattice.org/collections/43804412-1207-4455-945a-ceb2e88ce8db"
                    isExternal
                    textDecoration="underline"
                  >
                    Accessibility in Doenet
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this workshop, participants will learn best practices for
                  creating accessible activities in Doenet. They will learn how
                  to use the accessibility features in Doenet in order to make
                  their activities more inclusive.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Tuesday, May 26, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> 5–7pm Eastern, 2pm–4pm Pacific
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://scholarlattice.org/collections/43804412-1207-4455-945a-ceb2e88ce8db"
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
                <Heading size="md">July Doenet Virtual Workshop</Heading>
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
                  Registration details coming soon!
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
                mb={6}
                pl={4}
                borderLeft="3px solid"
                borderColor="border"
              >
                <Heading size="md">Doenet Community Workshop</Heading>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Dates:</strong> June 1–5 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Location:</strong> University of Minnesota
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  We invite you to participate in a five-day in-person workshop
                  to learn how to create richly interactive classroom activities
                  using the free and open-source Doenet platform. Not only is
                  Doenet a fun way to create cool activities, it is also a
                  community of STEM instructors and authors who strive to engage
                  students' minds and spur active interaction with mathematical
                  ideas. We welcome you to work together with us to develop an
                  open-source community, resources, and tools that enable anyone
                  to create exploratory activities with feedback.
                </Text>

                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://cse.umn.edu/math/events/doenet-community-workshop-2026"
                    colorScheme="blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Details and registration at the University of Minnesota
                  </Button>
                </Text>
              </VStack>

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
