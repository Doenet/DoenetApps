import { useEffect, useRef, useState } from "react";
import { HiOutlineMail } from "react-icons/hi";
import { BsGithub, BsDiscord } from "react-icons/bs";
import {
  Box,
  Text,
  IconButton,
  Flex,
  Image,
  Link as ChakraLink,
  Tooltip,
  Grid,
  GridItem,
  HStack,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Button,
  Stack,
  VStack,
} from "@chakra-ui/react";
import { Link as ReactRouterLink, useOutletContext } from "react-router";
import { SiteContext } from "./SiteHeader";
import { getDiscourseUrl } from "../utils/discourse";
import { WithSideBanners } from "../layout/WithSideBanners";
import { FaExternalLinkAlt } from "react-icons/fa";

export async function loader() {
  return {};
}

export function Home() {
  useEffect(() => {
    document.title = `Doenet - Richly interactive classroom activities`;
  }, []);

  const { user } = useOutletContext<SiteContext>();

  const discussHref = getDiscourseUrl(user);

  // The first string is the video source path,
  // the second string is the link to try the activity.
  // The number is the time to show the video before transitioning (ms).
  // Ordered from what to show first to last in the carousel.
  const heroVideos: [string, string, number][] = [
    ["/homepage/tangent.mp4", "/activityViewer/hV7Y2RtkeLGN4tQ3VMSEck/", 8000],
    [
      "/homepage/function_through_point.mp4",
      "/activityViewer/fw4KSbxXSKzRJMsaN3oTWR/",
      8000,
    ],
    ["/homepage/tangrams.mp4", "/activityViewer/gyp15j3SxMKp5QUY8Y6tEr/", 8000],
    [
      "/homepage/distribution.mp4",
      "/activityViewer/jy8EXxXhrfvpDcn8pjd6Ue",
      8000,
    ],
    [
      "/homepage/sine_1_over_x.mp4",
      "/activityViewer/pV9Ngvj1XUbBa8T2gb6TNa/",
      8000,
    ],
    ["/homepage/star.mp4", "/activityViewer/dhZmppQfsZzd1YwumJ6XDB/", 8000],
    [
      "/homepage/parametric.mp4",
      "/activityViewer/sHTwF3vMXGzyrKnLc7q5Vp/",
      8000,
    ],
    [
      "/homepage/line_through_two_points.mp4",
      "/activityViewer/gGgWmLWo3db84kXTV4y6AR/",
      8000,
    ],
  ];

  const heroSection = (
    <Box width="100%">
      <WithSideBanners bgColor="background" padding="40px">
        <Grid
          templateColumns={{ base: "1fr", lg: "1fr auto" }}
          w="100%"
          gap={{ base: "0px", lg: "20px" }}
          alignItems="stretch"
        >
          <GridItem
            position="relative"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            h="100%"
            order={{ base: 2, md: 1 }}
          >
            <Heading
              color="text"
              fontSize={{ base: "28px", sm: "34px", md: "44px", lg: "56px" }}
              fontWeight="500"
              mb="24px"
            >
              Richly interactive classroom activities
            </Heading>

            <Text
              color="text"
              fontSize={{
                base: "16px",
                sm: "18px",
                md: "20px",
                lg: "24px",
              }}
              fontWeight="400"
              mb={{ base: "12px", md: "16px", lg: "20px" }}
              maxW={{ base: "100%", md: "680px", lg: "800px" }}
            >
              We're a community of STEM instructors and authors. Find, create,
              and share meaningfully interactive content using a free
              community-driven tool.
              {/* TODO: Find spot to mention AI, such as:
                "Human-crafted activities in the age of AI" */}
            </Text>

            <HStack
              spacing={{ base: "12px", md: "16px" }}
              mt={{ base: "24px", md: "32px" }}
              flexWrap="wrap"
            >
              <Button
                as={ReactRouterLink}
                to="/scratchPad"
                colorScheme="blue"
                size={{ base: "md", md: "lg" }}
                fontSize={{ base: "16px", md: "18px" }}
                px={{ base: "24px", md: "32px" }}
                py={{ base: "12px", md: "16px" }}
                height="auto"
              >
                Start writing
              </Button>
              <Button
                as={ReactRouterLink}
                to="/explore"
                variant="outline"
                colorScheme="blue"
                size={{ base: "md", md: "lg" }}
                fontSize={{ base: "16px", md: "18px" }}
                px={{ base: "24px", md: "32px" }}
                py={{ base: "12px", md: "16px" }}
                height="auto"
                borderWidth="2px"
              >
                Explore community activities
              </Button>
            </HStack>

            {/* Mobile video directly under text */}
            <Box
              display={{ base: "block", lg: "none" }}
              mt="40px"
              mx={{ base: "-16px", lg: "0" }}
            >
              <VideoCarousel videos={heroVideos} />
            </Box>
          </GridItem>

          <GridItem
            mr={{ base: "0px", lg: "65px" }}
            pt="0px"
            pb="40px"
            display={{ base: "none", lg: "flex" }}
            justifyContent="flex-end"
            order={{ base: 1, lg: 2 }}
            colSpan={{ base: 1, lg: "auto" }}
          >
            <VideoCarousel videos={heroVideos} />
          </GridItem>
        </Grid>
      </WithSideBanners>
    </Box>
  );

  // const exploreSection = (
  //   <WithSideBanners bgColor="white" padding="50px">
  //     <Heading size="lg">Explore community content</Heading>

  //     <Heading size="md" pl="40px" mt="20px">
  //       Puzzles and widgets
  //     </Heading>
  //     <HStack pl="40px" pr="40px">
  //       {grayBox} {grayBox} {grayBox} {grayBox} {grayBox}
  //     </HStack>
  //     <Heading size="md" pl="40px" mt="20px">
  //       Explorations
  //     </Heading>
  //     <HStack pl="40px" pr="40px">
  //       {grayBox} {grayBox} {grayBox} {grayBox} {grayBox}
  //     </HStack>

  //     <Heading size="md" pl="40px" mt="20px">
  //       Problems
  //     </Heading>
  //     <HStack pl="40px" pr="40px">
  //       {grayBox} {grayBox} {grayBox} {grayBox} {grayBox}
  //     </HStack>
  //   </WithSideBanners>
  // );

  const featuresSection = (
    <WithSideBanners bgColor="#d3dff1ff" padding="70px">
      <Heading size="lg" mb="20px">
        Customize or create your own activities
      </Heading>

      <VStack align="flex-start" fontSize="1.4rem">
        <HStack spacing="20px">
          {/* TODO: Instant feedback image */}

          <Text fontSize="22px" fontWeight="400">
            <strong>Instant feedback for students.</strong> Guide students with
            immediate validation or hints based on their mistake
          </Text>
        </HStack>

        <HStack spacing="20px">
          <Text fontSize="22px" fontWeight="400">
            <strong>Interactive graphics.</strong> Construct gradable graphical
            applets from points, lines, derivatives, etc.
          </Text>

          {/* TODO: interactive graphics image */}
        </HStack>

        <Flex width="100%" alignItems="center">
          {/* TODO: variant control image */}

          <Flex flex="1 0 75%">
            <Text fontSize="22px" fontWeight="400">
              <strong>Variant control.</strong> Generate multiple variants of
              your activity
            </Text>
          </Flex>
        </Flex>
      </VStack>
    </WithSideBanners>
  );

  const newsletterSection = (
    <WithSideBanners bgColor="doenet.mainBlue" padding="45px">
      <Heading size="lg" color="white">
        Interested? Stay in the loop
      </Heading>
      <Text fontSize="22px" fontWeight="400" mb="15px" color="white">
        Receive monthly emails about Doenet, upcoming training workshops, and
        what's going on in the community.
      </Text>
      <Button
        as="a"
        href="https://docs.google.com/forms/d/e/1FAIpQLSc9VSrYnybkB5WC5YpPKicclF_z14UIq5O7l19f1Vxz8EFXCw/viewform?usp=header"
        target="_blank"
        rel="noopener noreferrer"
        fontSize={{ base: "16px", md: "18px" }}
      >
        Keep me updated
      </Button>
    </WithSideBanners>
  );

  const communitySection = (
    <WithSideBanners bgColor="white" padding="70px">
      <Heading size="lg">A community project</Heading>

      <Text marginTop="10px" fontSize="22px" fontWeight="400">
        Doenet—as a free and open-source platform—derives its value from its
        community of authors and contributors. To get support, check out our{" "}
        <ChakraLink href={discussHref} textDecoration="underline">
          community discussions
        </ChakraLink>{" "}
        or our{" "}
        <ChakraLink
          href="https://discord.gg/PUduwtKJ5h"
          textDecoration="underline"
        >
          Discord server
        </ChakraLink>
        . To learn how to get involved, check out{" "}
        <ChakraLink href="/get-involved" textDecoration="underline">
          How to get involved with Doenet
        </ChakraLink>
        .
      </Text>
      <Heading size="lg" marginTop="70px">
        Events
      </Heading>
      <Stack direction={{ base: "column", md: "row" }}>
        <Card>
          <CardHeader>
            <Heading size="sm">
              Intro to Doenet Virtual Workshop
              <br /> May 5, 5–7pm Eastern, 2pm–4pm Pacific
            </Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize={"18px"} fontWeight="500">
              In this workshop, participants will be introduced to the free and
              open-source platform Doenet. They will learn about the key
              constructs of Doenet and learn how to create Doenet activities
              with basic answer validation.
            </Text>

            <Button
              as="a"
              href="https://scholarlattice.org/collections/b8ec4af3-8f71-4e4a-b86e-838242e47058"
              colorScheme="blue"
              target="_blank"
              rel="noopener noreferrer"
              mt="1em"
            >
              Details and registration at ScholarLattice
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Heading size="sm">
              Virtual office hours, Tuesdays, 2–4pm Eastern, 11am–1pm Pacific
            </Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize={"18px"} fontWeight="500">
              Drop in anytime during the two hours to ask questions. Join us at{" "}
              <ChakraLink
                href="https://mathtech.org/dropin"
                isExternal
                textDecoration="underline"
              >
                this Zoom link
              </ChakraLink>
              .
            </Text>
          </CardBody>
        </Card>
      </Stack>

      <Text fontSize={"24px"} mt="1em">
        See the{" "}
        <ChakraLink href="/events" textDecoration="underline">
          events page
        </ChakraLink>{" "}
        for more upcoming events.
      </Text>
    </WithSideBanners>
  );

  const footerSection = (
    <WithSideBanners bgColor="black">
      <VStack pb="100px" pt="10px">
        <Flex columnGap="10px" m="10px">
          <ChakraLink href="mailto:info@doenet.org">
            <Tooltip label="mailto:info@doenet.org">
              <IconButton
                colorScheme="blue"
                size="sm"
                fontSize="16pt"
                aria-label="Email Doenet"
                icon={<HiOutlineMail />}
              />
            </Tooltip>
          </ChakraLink>

          <ChakraLink href="https://github.com/Doenet/">
            <Tooltip label="Doenet Github">
              <IconButton
                colorScheme="blue"
                size="sm"
                fontSize="16pt"
                aria-label="Doenet GitHub"
                icon={<BsGithub />}
              />
            </Tooltip>
          </ChakraLink>
          <ChakraLink href="https://discord.gg/PUduwtKJ5h">
            <Tooltip label="Doenet Discord">
              <IconButton
                colorScheme="blue"
                size="sm"
                fontSize="16pt"
                aria-label="Doenet Discord"
                icon={<BsDiscord />}
              />
            </Tooltip>
          </ChakraLink>

          <ChakraLink href="http://creativecommons.org/licenses/by/4.0/">
            <Image
              src="https://i.creativecommons.org/l/by/4.0/88x31.png"
              alt="Creative Commons CC-BY License"
            />
          </ChakraLink>
        </Flex>
        <Text
          as="div"
          fontSize="14px"
          maxWidth="750px"
          textAlign="center"
          color="white"
        >
          <Text color="white">
            This work is licensed under a{" "}
            <ChakraLink
              color="doenet.lightBlue"
              href="http://creativecommons.org/licenses/by/4.0/"
            >
              Creative Commons Attribution 4.0 International License
            </ChakraLink>
            .
          </Text>
          Doenet is a collaborative project involving the University of
          Minnesota, the Ohio State University, and Cornell University, with
          support from the National Science Foundation (DUE-1915294,
          DUE-1915363, DUE-1915438). Any opinions, findings, and conclusions or
          recommendations expressed in this material are those of the author(s)
          and do not necessarily reflect the views of the National Science
          Foundation.{" "}
        </Text>
      </VStack>
    </WithSideBanners>
  );

  return (
    <>
      {heroSection}
      {/* {exploreSection} */}
      {featuresSection}
      {newsletterSection}
      {communitySection}
      {footerSection}
    </>
  );
}

function VideoCarousel({ videos }: { videos: [string, string, number][] }) {
  // SETTINGS
  const VIDEO_WIDTH_PX = 500;
  const VIDEO_HEIGHT_PX = 580;
  // Single control for arrow-to-video proximity:
  // arrowGap: px between the arrow button and the video edge.
  const ARROW_BUTTON_PX = 24; // button size (px)
  const iconSize = 36; // chevron svg size
  const iconStroke = 3; // chevron stroke thickness

  const [index, setIndex] = useState(0);
  // const [isHovered, setIsHovered] = useState(false);

  const [overlayShown, setOverlayShown] = useState(false);

  const timeouts = useRef<number[]>([]);
  const isTransitioning = useRef(false);
  const indexRef = useRef(index);
  const overlayTransitionMsRef = useRef<number | null>(null);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    // Use the current video's 3rd tuple element as the delay (ms). Fallback to 10000ms.
    const current = videos && videos[index];
    const delay =
      current && typeof current[2] === "number" ? current[2] : 10000;

    if (!videos || videos.length <= 1) return;
    const id = window.setInterval(() => {
      const next = (indexRef.current + 1) % videos.length;
      performTransition(next, false);
    }, delay);
    return () => window.clearInterval(id);
  }, [videos, index]);

  // performTransition: fade to white, swap video, fade back
  function performTransition(nextIndex: number, useFastTransition = false) {
    if (isTransitioning.current) return;

    const fadeOutMs = useFastTransition ? 50 : 600;
    const holdMs = useFastTransition ? 0 : 500;
    const fadeInMs = useFastTransition ? 400 : 800;

    // The following code performs the transition in four steps:
    // 1. Fade out to white
    // 2. Swap video source and hold white
    // 3. Fade back in
    // 4. cleanup
    // They are declared in reverse order to allow easier chaining of timeouts.

    const cleanUpTransition = () => {
      isTransitioning.current = false;
      overlayTransitionMsRef.current = null;
    };

    const startFadeIn = () => {
      overlayTransitionMsRef.current = fadeInMs;
      setOverlayShown(false);
      timeouts.current.push(window.setTimeout(cleanUpTransition, fadeInMs));
    };

    const startSwapAndHold = () => {
      setIndex(nextIndex);
      timeouts.current.push(window.setTimeout(startFadeIn, holdMs));
    };

    // Start fade out
    isTransitioning.current = true;
    overlayTransitionMsRef.current = fadeOutMs;
    setOverlayShown(true);
    timeouts.current.push(window.setTimeout(startSwapAndHold, fadeOutMs));
  }

  // replace manual handlers to perform transition
  const handlePrev = () => {
    const next = (indexRef.current - 1 + videos.length) % videos.length;
    performTransition(next, true);
  };
  const handleNext = () => {
    const next = (indexRef.current + 1) % videos.length;
    performTransition(next, true);
  };

  // cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };
  }, []);

  if (!videos || videos.length === 0) return null;

  const currentVideoSrc = videos[index][0];
  const currentTryLink = videos[index][1];

  // Note: There are two versions of the layout: desktop (arrows on sides) and mobile (arrows below)
  // The desktop version is shown on medium and larger screens, while the mobile version is shown on smaller screens.
  // We toggle between them using Chakra UI's responsive display properties.

  return (
    <VStack align="center" spacing={4}>
      {/* Desktop layout: arrows on sides */}
      <HStack
        alignItems="center"
        justifyContent="center"
        display={{ base: "none", lg: "flex" }}
      >
        {/* Left arrow */}
        <IconButton
          aria-label="Previous video"
          icon={<ThickChevronLeft size={iconSize} stroke={iconStroke} />}
          onClick={handlePrev}
          bg="transparent"
          color="text"
          _focus={{ boxShadow: "none" }}
          transition="none"
          _hover={{
            transform: "none",
            bg: "transparent",
            "svg path": { strokeWidth: 5 },
          }}
          _active={{ transform: "none" }}
          h={`${ARROW_BUTTON_PX}px`}
          w={`${ARROW_BUTTON_PX}px`}
          borderRadius="full"
        />

        <Box
          position="relative"
          border="1px solid lightgray"
          width={`${VIDEO_WIDTH_PX}px`}
          aspectRatio={VIDEO_WIDTH_PX / VIDEO_HEIGHT_PX}
          overflow="hidden"
          flexShrink={0}
        >
          <video
            key={index}
            src={currentVideoSrc}
            autoPlay
            muted
            playsInline
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "100%",
              display: "block",
              objectFit: "cover",
              backgroundColor: "white",
            }}
          />

          {/* white overlay used for fade transition */}
          <Box
            pointerEvents="none"
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="white"
            zIndex={2}
            style={{
              opacity: overlayShown ? 1 : 0,
              transition: `opacity ${overlayTransitionMsRef.current ?? 0}ms ease`,
            }}
          />

          {/* Try me button positioned top-right on the video */}
          <IconButton
            as={ReactRouterLink}
            to={currentTryLink}
            target="_blank"
            rel="noopener noreferrer"
            icon={<FaExternalLinkAlt />}
            position="absolute"
            top="2px"
            right="2px"
            zIndex={5}
            color="text"
            _hover={{
              textDecoration: "none",
            }}
            size="md"
            borderRadius="8px"
            aria-label="Try this activity"
            pointerEvents={overlayShown ? "none" : "auto"}
            aria-disabled={overlayShown}
            disabled={overlayShown}
            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
            bg="transparent"
            style={{
              transform: "scale(1.2)",
              transformOrigin: "top right",
              backfaceVisibility: "hidden",
            }}
          />
        </Box>

        {/* Right arrow */}
        <IconButton
          aria-label="Next video"
          icon={<ThickChevronRight size={iconSize} stroke={iconStroke} />}
          onClick={handleNext}
          bg="transparent"
          color="text"
          transition="none"
          _hover={{
            transform: "none",
            bg: "transparent",
            "svg path": { strokeWidth: 5 },
          }}
          _active={{ transform: "none" }}
          h={`${ARROW_BUTTON_PX}px`}
          w={`${ARROW_BUTTON_PX}px`}
          borderRadius="full"
        />
      </HStack>

      {/* Mobile layout: video with arrows underneath */}
      <VStack spacing={4} display={{ base: "flex", lg: "none" }}>
        <Box
          position="relative"
          border="3px solid lightgray"
          width={`min(100vw, ${VIDEO_WIDTH_PX}px)`}
          aspectRatio={VIDEO_WIDTH_PX / VIDEO_HEIGHT_PX}
          overflow="hidden"
          flexShrink={0}
        >
          <video
            key={index}
            src={currentVideoSrc}
            autoPlay
            muted
            playsInline
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
              backgroundColor: "white",
            }}
          />

          {/* white overlay used for fade transition */}
          <Box
            pointerEvents="none"
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="white"
            zIndex={2}
            style={{
              opacity: overlayShown ? 1 : 0,
              transition: `opacity ${overlayTransitionMsRef.current ?? 0}ms ease`,
            }}
          />

          {/* Try me button positioned top-right on the video */}
          <IconButton
            as={ReactRouterLink}
            to={currentTryLink}
            target="_blank"
            rel="noopener noreferrer"
            icon={<FaExternalLinkAlt />}
            position="absolute"
            top="2px"
            right="2px"
            zIndex={5}
            color="text"
            _hover={{
              textDecoration: "none",
            }}
            size="md"
            borderRadius="8px"
            aria-label="Try this activity"
            pointerEvents={overlayShown ? "none" : "auto"}
            aria-disabled={overlayShown}
            disabled={overlayShown}
            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
            bg="transparent"
            style={{
              transform: "scale(1.2)",
              transformOrigin: "top right",
              backfaceVisibility: "hidden",
            }}
          />
        </Box>

        {/* Mobile navigation arrows underneath video */}
        <HStack spacing={6} justifyContent="center">
          <IconButton
            aria-label="Previous video"
            icon={<ThickChevronLeft size={iconSize} stroke={iconStroke} />}
            onClick={handlePrev}
            bg="interact"
            color="text"
            _focus={{ boxShadow: "none" }}
            transition="none"
            _hover={{
              transform: "none",
              bg: "border",
              "svg path": { strokeWidth: 5 },
            }}
            _active={{ transform: "none" }}
            h={`${ARROW_BUTTON_PX + 8}px`}
            w={`${ARROW_BUTTON_PX + 8}px`}
            borderRadius="full"
            border="1px solid"
            borderColor="border"
          />

          <IconButton
            aria-label="Next video"
            icon={<ThickChevronRight size={iconSize} stroke={iconStroke} />}
            onClick={handleNext}
            bg="interact"
            color="text"
            transition="none"
            _hover={{
              transform: "none",
              bg: "border",
              "svg path": { strokeWidth: 5 },
            }}
            _active={{ transform: "none" }}
            h={`${ARROW_BUTTON_PX + 8}px`}
            w={`${ARROW_BUTTON_PX + 8}px`}
            borderRadius="full"
            border="1px solid"
            borderColor="border"
          />
        </HStack>
      </VStack>
    </VStack>
  );
}

function ThickChevronLeft({
  size = 36,
  stroke = 3,
}: {
  size?: number;
  stroke?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable={false}
    >
      <path
        d="M15 6 L9 12 L15 18"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ThickChevronRight({
  size = 36,
  stroke = 3,
}: {
  size?: number;
  stroke?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable={false}
    >
      <path
        d="M9 6 L15 12 L9 18"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
