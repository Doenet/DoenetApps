// import axios from 'axios';
import {
  // Button,
  Box,
  Icon,
  Text,
  Flex,
  Wrap,
  useDisclosure,
  Center,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Drawer,
} from "@chakra-ui/react";
import Button from "react-bootstrap/Button";
import React, { useEffect, useRef, useState } from "react";
import {
  redirect,
  useOutletContext,
  useLoaderData,
  useNavigate,
  useFetcher,
} from "react-router-dom";
import styled from "styled-components";

import { RiEmotionSadLine } from "react-icons/ri";
import RecoilActivityCard from "../../../_reactComponents/PanelHeaderComponents/RecoilActivityCard";
import { GeneralActivityControls } from "./PortfolioActivityEditor";
import axios from "axios";
import findFirstPageIdInContent from "../../../_utils/findFirstPage";

export async function action({ request }) {
  const formData = await request.formData();
  let formObj = Object.fromEntries(formData);

  if (formObj._action == "update general") {
    //Don't let label be blank
    let label = formObj?.label?.trim();
    if (label == "") {
      label = "Untitled";
    }
    let learningOutcomes = JSON.parse(formObj.learningOutcomes);
    let response = await axios.post(
      "/api/updatePortfolioActivitySettings.php",
      {
        label,
        imagePath: formObj.imagePath,
        public: formObj.public,
        doenetId: formObj.doenetId,
        learningOutcomes,
      },
    );
    return true;
  } else if (formObj?._action == "Add Activity") {
    //Create a portfilio activity and redirect to the editor for it
    let response = await fetch("/api/createPortfolioActivity.php");

    if (response.ok) {
      let { doenetId, pageDoenetId } = await response.json();
      return redirect(
        `/portfolioeditor/${doenetId}?tool=editor&doenetId=${doenetId}&pageId=${pageDoenetId}`,
      );
    } else {
      throw Error(response.message);
    }
  } else if (formObj?._action == "Delete") {
    let response = await fetch(
      `/api/deletePortfolioActivity.php?doenetId=${formObj.doenetId}`,
    );

    if (response.ok) {
      // let respObj = await response.json();
      return true;
    } else {
      throw Error(response.message);
    }
  } else if (formObj?._action == "Make Public") {
    let response = await fetch(
      `/api/updateIsPublicActivity.php?doenetId=${formObj.doenetId}&isPublic=1`,
    );

    if (response.ok) {
      // let respObj = await response.json();
      return true;
    } else {
      throw Error(response.message);
    }
  } else if (formObj?._action == "Make Private") {
    let response = await fetch(
      `/api/updateIsPublicActivity.php?doenetId=${formObj.doenetId}&isPublic=0`,
    );

    if (response.ok) {
      // let respObj = await response.json();
      return true;
    } else {
      throw Error(response.message);
    }
  } else if (formObj?._action == "noop") {
    return true;
  }

  throw Error(`Action "${formObj?._action}" not defined or not handled.`);
}

export async function loader({ params }) {
  //If we didn't create the course yet for this user then create it
  if (params.courseId == "not_created") {
    const { data } = await axios.get("/api/createPortfolioCourse.php");
    return redirect(`/portfolio/${data.portfolioCourseId}`);
  }

  const { data } = await axios.get(
    `/api/getPortfolio.php?courseId=${params.courseId}`,
  );
  if (data.notMe) {
    return redirect(`/publicportfolio/${params.courseId}`);
  }

  //Add pageDoenetId to all activities
  let publicActivities = [];
  data.publicActivities.map((activity) => {
    const pageDoenetId = findFirstPageIdInContent(activity.content);
    publicActivities.push({ ...activity, pageDoenetId });
  });
  let privateActivities = [];
  data.privateActivities.map((activity) => {
    const pageDoenetId = findFirstPageIdInContent(activity.content);
    privateActivities.push({ ...activity, pageDoenetId });
  });

  return {
    courseId: params.courseId,
    fullName: data.fullName,
    publicActivities,
    privateActivities,
  };
}

const PublicActivitiesSection = styled.div`
  grid-row: 2/3;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 10px 10px;
  margin: 0px;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: var(--lightBlue);
`;

const PrivateActivitiesSection = styled.div`
  grid-row: 3/4;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 10px 10px;
  margin: 0px;
  justify-content: flex-start;
  align-items: center;
  text-align: center;
  background: var(--mainGray);
`;

const PortfolioGrid = styled.div`
  display: grid;
  grid-template-rows: 80px min-content auto;
  /* grid-template-rows: 80px min-content min-content; */
  height: 100vh;
`;

function PortfolioSettingsDrawer({
  isOpen,
  onClose,
  finalFocusRef,
  doenetId,
  data,
  courseId,
}) {
  // const { pageId, activityData } = useLoaderData();
  // console.log({ doenetId, data });
  const fetcher = useFetcher();
  let activityData;
  if (doenetId) {
    let publicIndex = data.publicActivities.findIndex(
      (obj) => obj.doenetId == doenetId,
    );
    if (publicIndex != -1) {
      activityData = data.publicActivities[publicIndex];
    } else {
      let privateIndex = data.privateActivities.findIndex(
        (obj) => obj.doenetId == doenetId,
      );
      if (privateIndex != -1) {
        activityData = data.privateActivities[privateIndex];
      } else {
        //Throw error not found
      }
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="lg"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <Center>
            <Text>Activity Settings</Text>
          </Center>
        </DrawerHeader>

        <DrawerBody>
          {doenetId && (
            <GeneralActivityControls
              fetcher={fetcher}
              doenetId={doenetId}
              activityData={activityData}
              courseId={courseId}
            />
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export function Portfolio() {
  let context = useOutletContext();
  let data = useLoaderData();
  const [doenetId, setDoenetId] = useState();
  const controlsBtnRef = useRef(null);

  const navigate = useNavigate();
  const {
    isOpen: settingsAreOpen,
    onOpen: settingsOnOpen,
    onClose: settingsOnClose,
  } = useDisclosure();

  useEffect(() => {
    document.title = `Portfolio - Doenet`;
  }, []);

  //Don't do more processing if we don't know if we are signed in or not
  if (context.signedIn == null) {
    return null;
  }

  return (
    <>
      <PortfolioSettingsDrawer
        isOpen={settingsAreOpen}
        onClose={settingsOnClose}
        finalFocusRef={controlsBtnRef}
        doenetId={doenetId}
        data={data}
        courseId={data.courseId}
      />
      <PortfolioGrid>
        <Box
          gridRow="1/2"
          backgroundColor="#fff"
          color="#000"
          height="80px"
          position="fixed"
          width="100%"
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          textAlign="center"
          zIndex="500"
        >
          <Text fontSize="24px" fontWeight="700">
            {data.fullName}
          </Text>
          <Text fontSize="16px" fontWeight="700">
            Portfolio
          </Text>
          <div style={{ position: "absolute", top: "48px", right: "10px" }}>
            <Button
              variant="primary"
              data-test="Add Activity"
              // size="xs"
              // colorScheme="blue"
              onClick={async () => {
                //Create a portfilio activity and redirect to the editor for it
                let response = await fetch("/api/createPortfolioActivity.php");

                if (response.ok) {
                  let { doenetId, pageDoenetId } = await response.json();
                  navigate(`/portfolioeditor/${doenetId}/${pageDoenetId}`);
                } else {
                  throw Error(response.message);
                }
              }}
            >
              Add Activity
            </Button>
          </div>
        </Box>
        <PublicActivitiesSection data-test="Public Activities">
          <Text fontSize="20px" fontWeight="700">
            Public
          </Text>
          <Wrap p="10px" overflow="visible">
            {data.publicActivities.length < 1 ? (
              <Flex
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                alignContent="center"
                minHeight={200}
                background="doenet.canvas"
                padding={20}
                width="100%"
              >
                <Icon fontSize="48pt" as={RiEmotionSadLine} />
                <Text fontSize="36pt">No Public Activities</Text>
              </Flex>
            ) : (
              <>
                {data.publicActivities.map((activity) => {
                  return (
                    <RecoilActivityCard
                      key={`Card${activity.doenetId}`}
                      {...activity}
                      fullName={data.fullName}
                      isPublic={true}
                      courseId={data.courseId}
                      setDoenetId={setDoenetId}
                      onClose={settingsOnClose}
                      onOpen={settingsOnOpen}
                    />
                  );
                })}
              </>
            )}
          </Wrap>
        </PublicActivitiesSection>

        <PrivateActivitiesSection data-test="Private Activities">
          <Text fontSize="20px" fontWeight="700">
            Private
          </Text>
          <Wrap p="10px" overflow="visible">
            {data.privateActivities.length < 1 ? (
              <Flex
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                alignContent="center"
                minHeight={200}
                background="doenet.canvas"
                padding={20}
                width="100%"
              >
                <Icon fontSize="48pt" as={RiEmotionSadLine} />
                <Text fontSize="36pt">No Private Activities</Text>
              </Flex>
            ) : (
              <>
                {data.privateActivities.map((activity) => {
                  return (
                    <RecoilActivityCard
                      key={`Card${activity.doenetId}`}
                      {...activity}
                      fullName={data.fullName}
                      isPublic={false}
                      courseId={data.courseId}
                      setDoenetId={setDoenetId}
                      onClose={settingsOnClose}
                      onOpen={settingsOnOpen}
                    />
                  );
                })}
              </>
            )}
          </Wrap>
        </PrivateActivitiesSection>
      </PortfolioGrid>
    </>
  );
}
