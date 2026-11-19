import { useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link as ChakraLink,
  Button,
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

              <Text fontSize="1.3rem" lineHeight="1.3" mb={6}>
                <ChakraLink
                  href="https://www.youtube.com/playlist?list=PLjR3fTlPri1cApUaszZrRwmvl0UtsR_GU"
                  isExternal
                  textDecoration="underline"
                >
                  Watch our past workshops on YouTube
                </ChakraLink>
              </Text>

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
                    href="https://docs.google.com/forms/d/e/1FAIpQLSdSWVecpISTxnIkFbM0PZ3wtQ-q_ObBWlzJvS1iPf7wFAd58g/viewform"
                    isExternal
                    textDecoration="underline"
                  >
                    November Doenet Virtual Workshop
                  </ChakraLink>
                </Heading>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  In this free 2-day virtual workshop held on Zoom, participants
                  will learn how to create accessible, dynamic and interactive
                  activities in Doenet. The workshop will also provide guidance
                  on using the available resources to learn more about Doenet,
                  including how to connect with the supportive Doenet community
                  of developers and experienced instructors.
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Date:</strong> Monday November 23 and Tuesday November
                  24, 2026
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> a TBD 2-hour block between 4–8pm
                  Eastern (1–5pm Pacific); register to suggest a preferred time
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <Button
                    as="a"
                    href="https://forms.gle/fqbZ9J9SbxxoNp5d8"
                    colorScheme="blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Registration form
                  </Button>
                </Text>
              </VStack>

              {/* <p>
                Email <a href="mailto:info@doenet.org">info@doenet.org</a> to
                inquire about any upcoming virtual training workshops.
              </p> */}
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
                <Heading size="md">AMATYC Workshop</Heading>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Title:</strong> Building Blocks For Active Learning:
                  Getting Started With Doenet
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Time:</strong> Friday, November 20, 10:15 am – 12:15
                  pm
                </Text>
                <Text fontSize="1rem" lineHeight="1.4">
                  <strong>Location:</strong> Philadelphia, PA, Marriott
                  Downtown, Franklin Hall 13
                </Text>
                <Text fontSize="1.3rem" lineHeight="1.3">
                  Want to create active learning experiences that engage
                  students and provide instant feedback? This session will get
                  you started with Doenet, a free and open-source platform for
                  authoring and sharing interactive activities. You'll learn to
                  create activities that give feedback to your students'
                  responses, guiding them to discover successful solutions.
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </WithSideBanners>
    </>
  );
}
