import React, { lazy, Suspense, useEffect } from "react";
import { useLoaderData, useOutletContext } from "react-router";
import { DoenetML } from "../../../Viewer/DoenetML";
import {
  pageVariantInfoAtom,
  pageVariantPanelAtom,
} from "../../../_sharedRecoil/PageViewerRecoil";
import { useRecoilState, useSetRecoilState } from "recoil";
import { Carousel } from "../../../_reactComponents/PanelHeaderComponents/Carousel";
import {
  Box,
  Center,
  Text,
  IconButton,
  Flex,
  Link,
  Image,
  Tooltip,
  useColorModeValue,
  Button,
  VStack,
  Grid,
  GridItem,
  HStack,
  Show,
  SimpleGrid,
} from "@chakra-ui/react";
import MigrationBanner from "../../../_reactComponents/PanelHeaderComponents/MigrationBanner";
import { HiOutlineMail } from "react-icons/hi";
import { BsGithub, BsDiscord } from "react-icons/bs";
import { MdBuild } from "react-icons/md";
import axios from "axios";
import { useFetcher } from "react-router-dom";

// export async function action() {
//   //Create a portfolio activity and redirect to the editor for it
//   let { data } = await axios.get("/api/createPortfolioActivity.php");

//   let { doenetId, pageDoenetId } = data;
//   return redirect(
//     `/portfolioeditor/${doenetId}?tool=editor&doenetId=${doenetId}&pageId=${pageDoenetId}`,
//   );
// }

export async function loader() {
  const response = await fetch("/api/loadPromotedContent.php");
  const data = await response.json();
  return data;
}

const HomeIntroVideo = lazy(() => import("./HomeIntroVideo"));

let doenetML = `
<example>
<setup>
<number name="num_lines">2</number>
<math name="left0">x^2+4x-3</math>
<math name="right0">2x^2+4x-7</math>
<math name="left1">x^2-3</math>
<math name="right1">2x^2-7</math>
</setup>

<p>Simplify the equation <m>$left0 = $right0</m>, explaining each step in the box at the right.</p>



<map name="map">
<template newNamespace>
<setup>
  <conditionalContent assignNames="(left_prefill right_prefill text_prefill)">
    <case condition="$i=1">$(../left0) $(../right0) <text>original expression</text></case>
    <case condition="$i=2">$(../left1) $(../right1) <text>subtracted 4x from both sides</text></case>
    <else>$(../map[$i-1]/left) $(../map[$i-1]/right) <text></text></else>
  </conditionalContent>
</setup>

<sideBySide widths="50% 40% 10%">
  <div>
    <mathInput name="left" prefill="$left_prefill"/>
    <m>=</m> <mathInput name="right" prefill="$right_prefill"/>
  </div>
  <div><textinput width="250px" height="35px" expanded prefill="$text_prefill" /></div>
  <div>
    <updateValue target="../num_lines" newValue="$(../num_lines)+1" 
         type="number" hide="$(../num_lines) > $i">
      <label>+</label>
    </updateValue><nbsp/>
    <updateValue target="../num_lines" newValue="$(../num_lines)-1" 
         type="number" hide="$(../num_lines) > $i" disabled="$i=1">
      <label>-</label>
    </updateValue>
  </div>
</sideBySide>
</template>
<sources alias="v" indexAlias="i"><sequence from="1" to="$num_lines" /></sources>
</map>



<hint>
<title>Hint on showing simplification steps</title>
<p>To perform a simplification step, click the <c>+</c> button, which will copy your work to a new line. Modify the expression and explain the step in the box to the right.  You can remove a line by clicking the <c>-</c> button.  Your work will be hand-graded after the due date.</p>
</hint>
  
</example>
`;

export function Home() {
  let context = useOutletContext();
  const loaderData = useLoaderData();

  const favorites = loaderData?.carouselData?.Homepage;

  const setVariantPanel = useSetRecoilState(pageVariantPanelAtom);
  const [variantInfo, setVariantInfo] = useRecoilState(pageVariantInfoAtom);

  useEffect(() => {
    document.title = `Home - Doenet`;
  }, []);

  function variantCallback(generatedVariantInfo, allPossibleVariants) {
    // console.log(">>>variantCallback",generatedVariantInfo,allPossibleVariants)
    const cleanGeneratedVariant = JSON.parse(
      JSON.stringify(generatedVariantInfo),
    );
    setVariantPanel({
      index: cleanGeneratedVariant.index,
      allPossibleVariants,
    });
    setVariantInfo({
      index: cleanGeneratedVariant.index,
    });
  }

  const grayColor = useColorModeValue("doenet.mainGray", "doenet.lightGray");
  const blueColor = useColorModeValue("doenet.lightBlue", "doenet.mainBlue");
  const blackColor = "black";
  const whiteColor = useColorModeValue("white", "gray.900");
  const textColor = useColorModeValue("doenet.canvas", "doenet.canvastext");

  //Don't do more processing if we don't know if we are signed in or not
  if (context.signedIn == null) {
    return null;
  }

  const heroTextAndActions = () => {
    return (
      <Box pr="20px" pl="20px">
        <Text color="white" fontSize={["40px", "5vw"]} fontWeight="700">
          Interactive activities to engage your students
        </Text>
        <Flex textAlign="left" flexDirection="column" gap={4} mt="70px">
          <Text color="white" fontSize={["24px", "2vw"]} fontWeight="700">
            Enhance your classroom with great OER resources from Doenet and
            learn how we make it easy to create your own.
          </Text>
          <Link href="/community">
            <Button
              mt="20px"
              p="10px"
              colorScheme="blue"
              // these are out of order because on phones we change the number of columns
              w={["260px", "200px", "260px", "300px"]}
              h={["40px", "40px", "40px", "50px", "60px"]}
              fontSize={["18px", "18px", "18px", "22px", "26px"]}
            >
              Explore Activities
            </Button>
          </Link>
          <Link
            href="https://doenet-ml.vercel.app/tutorials/quickStart"
            isExternal
          >
            <Button
              mt="20px"
              p="10px"
              colorScheme="blue"
              w={["260px", "200px", "260px", "300px"]}
              h={["40px", "40px", "40px", "50px", "60px"]}
              fontSize={["18px", "18px", "18px", "22px", "26px"]}
            >
              Learn to Make Your Own
            </Button>
          </Link>
        </Flex>
      </Box>
    );
  };

  return (
    <>
      <MigrationBanner variant="wide" />
      <Flex
        alignItems="center"
        justifyContent="center"
        bg={blackColor}
        py="30px"
      >
        <Show above="sm">
          <Grid
            gridTemplateAreas={`"Description Video"
        `}
            // gridTemplateRows={"120px auto"}
            gridTemplateColumns={"60vw auto"}
          >
            <GridItem area="Description" margin="10vh 0 0 10vh">
              {heroTextAndActions()}
            </GridItem>
            <GridItem area="Video" p="40px">
              <Suspense fallback={"Loading..."}>
                {/* Does this lazy loading do anything? */}
                <Box ml="30px">
                  <HomeIntroVideo />
                </Box>
              </Suspense>
            </GridItem>
          </Grid>
        </Show>
        <Show below="sm">
          <SimpleGrid columns={[1, 1, 2, 2, 2]} spacing="10px">
            <Suspense fallback={"Loading..."}>
              {/* Does this lazy loading do anything? */}
              <Box ml="30px">
                <HomeIntroVideo />
              </Box>
            </Suspense>
            {heroTextAndActions()}
          </SimpleGrid>
        </Show>
      </Flex>

      <Center w="100%" bg={grayColor} pl="10px" pr="10px">
        <VStack
          maxWidth="900px"
          w="100%"
          spacing={4}
          marginTop="40px"
          marginBottom="40px"
        >
          <HStack>
            <Text
              fontSize={["30px", "30px", "30px", "40px", "60px"]}
              // fontSize="60px"
              fontWeight="700"
              color={blackColor}
            >
              Drop-In Office Hours
            </Text>
          </HStack>
          <Text
            pt="24px"
            fontSize={"18px"}
            // fontSize="20px"
            fontWeight="500"
            color={blackColor}
          >
            As a member of the{" "}
            <Link
              href="https://prose.runestone.academy/"
              textDecoration="underline"
            >
              PROSE Consortium
            </Link>
            , Doenet invites you to join us each Tuesday 1-3pm Central{" "}
            <Link
              href="https://prose.runestone.academy/dropin/"
              textDecoration="underline"
            >
              on Zoom
            </Link>
            . Learn how to create great interactive activities for your classes
            in DoenetML and other powerful open source tools of the PROSE
            ecosystem.
            <br />
            <br />
            Join us at{" "}
            <Link
              href="https://prose.runestone.academy/dropin/"
              textDecoration="underline"
            >
              this Zoom link
            </Link>
            .
          </Text>
        </VStack>
      </Center>

      <Center w="100%" bg={"white"} paddingTop="40px" pl="10px" pr="10px">
        <HStack maxWidth="750px" w="100%" spacing={4}>
          <Text
            fontSize={["30px", "30px", "30px", "40px", "60px"]}
            // fontSize="60px"
            fontWeight="700"
            color={blackColor}
          >
            Explore
          </Text>
          <Text
            pt="24px"
            fontSize={["20px", null, null, "24px", "24px"]}
            fontWeight="700"
            color={blackColor}
          >
            Interact with{" "}
            <Link href="/community" textDecoration="underline">
              our existing content
            </Link>
          </Text>
        </HStack>
      </Center>
      <Flex
        justifyContent="center"
        alignItems="center"
        bg={"white"}
        p="60px 10px"
      >
        <Carousel title="Doenet Team Favorites" data={favorites} />
      </Flex>

      <Center w="100%" bg={blueColor} pl="10px" pr="10px">
        <VStack
          maxWidth="900px"
          w="100%"
          spacing={4}
          marginTop="40px"
          marginBottom="40px"
        >
          <HStack maxWidth="750px" w="100%" spacing={4}>
            <Text
              fontSize={["30px", "30px", "30px", "40px", "60px"]}
              // fontSize="60px"
              fontWeight="700"
              color={blackColor}
            >
              Learn
            </Text>
            <Text
              pt="24px"
              fontSize={["20px", null, null, "24px", "24px"]}
              // fontSize="20px"
              fontWeight="700"
              color={blackColor}
            >
              Designed for the In-Person Classroom
            </Text>
          </HStack>
          <Text
            pt="24px"
            fontSize={"18px"}
            // fontSize="20px"
            fontWeight="500"
            color={blackColor}
          >
            <Text fontSize="20px">Immediate feedback in class</Text>
            <Text fontSize="18px" marginLeft="10px">
              One benefit of using Doenet during in-class activities is the
              immediate feedback students receive even before an instructor can
              come by their group.
            </Text>

            <Show above="sm">
              <Text fontSize="20px" marginTop="10px">
                Open-ended response
              </Text>
              <Text fontSize="18px" marginLeft="10px">
                Try our open-ended response example! (
                <Link
                  rel="noreferrer"
                  target="_blank"
                  textDecoration={"underline"}
                  href="https://www.doenet.org/public?tool=editor&doenetId=_4hcncjV6Ffabz5lhD47aL"
                >
                  See source
                </Link>
                )
              </Text>
            </Show>
          </Text>

          <Show above="sm">
            <Flex
              bg={whiteColor}
              //py="10px"
              justifyContent="center"
              alignItems="center"
              width={["350px", "450px", "650px", "850px"]}
              overflow="clip"
            >
              <DoenetML
                key={`HPpageViewer`}
                doenetML={doenetML}
                flags={{
                  showCorrectness: true,
                  solutionDisplayMode: "button",
                  showFeedback: true,
                  showHints: true,
                  autoSubmit: false,
                  allowLoadState: false,
                  allowSaveState: false,
                  allowLocalState: false,
                  allowSaveSubmissions: false,
                  allowSaveEvents: false,
                }}
                // activityId={doenetId}
                attemptNumber={1}
                generatedVariantCallback={variantCallback} //TODO:Replace
                requestedVariantIndex={variantInfo.index}
                // setIsInErrorState={setIsInErrorState}
                addBottomPadding={false}
                linkSettings={{
                  viewURL: "/portfolioviewer",
                  editURL: "/publiceditor",
                }}
              />
            </Flex>
          </Show>
        </VStack>
      </Center>
      <Center
        width="100%"
        bg={blackColor}
        // bg={grayColor}
        color="doenet.canvastext"
        padding="20px 40px"
        display="flex"
        flexDirection="column"
        p="10px"
        pb="100px"
      >
        <Flex columnGap="10px" m="10px">
          <Link href="mailto:info@doenet.org">
            <Tooltip label="mailto:info@doenet.org">
              <IconButton
                colorScheme="blue"
                size="sm"
                fontSize="16pt"
                icon={<HiOutlineMail />}
              />
            </Tooltip>
          </Link>

          <Link href="https://github.com/Doenet/">
            <Tooltip label="Doenet Github">
              <IconButton
                colorScheme="blue"
                size="sm"
                fontSize="16pt"
                icon={<BsGithub />}
              />
            </Tooltip>
          </Link>
          <Link href="https://discord.gg/PUduwtKJ5h">
            <Tooltip label="Doenet Discord">
              <IconButton
                colorScheme="blue"
                size="sm"
                fontSize="16pt"
                icon={<BsDiscord />}
              />
            </Tooltip>
          </Link>

          <Link href="http://creativecommons.org/licenses/by/4.0/">
            <Image src="https://i.creativecommons.org/l/by/4.0/88x31.png" />
          </Link>
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
            <Link
              color="doenet.mainBlue"
              href="http://creativecommons.org/licenses/by/4.0/"
            >
              Creative Commons Attribution 4.0 International License
            </Link>
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
      </Center>
    </>
  );
}
