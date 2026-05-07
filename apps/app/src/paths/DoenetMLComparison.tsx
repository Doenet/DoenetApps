import { DoenetEditor } from "@doenet/doenetml-iframe";
import { PanelPair } from "../widgets/PanelPair";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Icon,
  Link as ChakraLink,
  Show,
  Text,
  Tooltip,
  Button,
  Spacer,
  useDisclosure,
} from "@chakra-ui/react";
import {
  useLoaderData,
  useNavigate,
  Link as ReactRouterLink,
  useFetcher,
  ActionFunctionArgs,
} from "react-router";
import axios from "axios";

import { contentTypeToName, getIconInfo } from "../utils/activity";
import { createNameNoTag } from "../utils/names";
import {
  DocumentComparisonControls,
  documentComparisonControlsActions,
} from "../popups/DocumentComparisonControls";
import { DoenetmlVersion, UserInfo } from "../types";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const formObj = Object.fromEntries(formData);

  const resultBUA = await documentComparisonControlsActions({ formObj });
  if (resultBUA) {
    return resultBUA;
  }

  return null;
}

export async function loader({ params }: { params: any }) {
  const { data } = await axios.get(
    `/api/compare/getDoenetMLComparison/${params.contentId}/${params.compareId}`,
  );

  return data;
}

export function DoenetMLComparison() {
  const {
    activity,
    activityCompare,
    activityCompareChanged,
    activityAtCompare,
    compareRelation,
  } = useLoaderData() as {
    activity: {
      doenetML: string;
      doenetmlVersion: DoenetmlVersion;
      name: string;
      contentId: string;
    };
    activityCompare: {
      doenetML: string;
      doenetmlVersion: DoenetmlVersion;
      name: string;
      contentId: string;
      owner: UserInfo;
    };
    activityCompareChanged: boolean;
    activityAtCompare: boolean;
    compareRelation: "source" | "remix";
  };

  const navigate = useNavigate();
  const fetcher = useFetcher();

  const contentTypeName = contentTypeToName["singleDoc"];

  const { iconImage, iconColor } = getIconInfo("singleDoc", false);

  const typeIcon = (
    <Tooltip label={contentTypeName}>
      <Box>
        <Icon
          as={iconImage}
          color={iconColor}
          boxSizing="content-box"
          width="24px"
          height="24px"
          paddingRight="10px"
          verticalAlign="middle"
          aria-label={contentTypeName}
        />
      </Box>
    </Tooltip>
  );

  const {
    isOpen: basicActionsAreOpen,
    onOpen: basicActionsOnOpen,
    onClose: basicActionsOnClose,
  } = useDisclosure();

  const basicUpdateActionsModel = (
    <DocumentComparisonControls
      isOpen={basicActionsAreOpen}
      onClose={basicActionsOnClose}
      activity={activity}
      activityCompare={activityCompare}
      activityCompareChanged={activityCompareChanged}
      activityAtCompare={activityAtCompare}
      compareRelation={compareRelation}
      fetcher={fetcher}
    />
  );

  let updateMessage;
  if (activityAtCompare && !activityCompareChanged) {
    updateMessage = `No possible update actions as your activity already matches the ${compareRelation === "source" ? "remix source" : "remixed activity"}`;
  } else {
    updateMessage = `Show possible actions for updating your activity from the ${compareRelation === "source" ? "remix source" : "remixed activity"}`;
  }

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  const currentEditor = (
    <Box height="100%">
      <Flex
        width="100%"
        height="30px"
        backgroundColor="doenet.mainGray"
        paddingLeft="10px"
        alignItems="center"
      >
        <Heading as="h3" size="sm">
          Your Activity:
        </Heading>
        <Text noOfLines={1} marginLeft="5px" fontStyle="italic">
          {activity.name}&nbsp;
        </Text>
        <Spacer />
      </Flex>

      <DoenetEditor
        height="100%"
        width="100%"
        doenetML={activity.doenetML}
        doenetmlVersion={activity.doenetmlVersion.fullVersion}
        border="none"
        readOnly={true}
        viewerLocation="bottom"
        showErrorsWarnings={false}
        showResponses={false}
        doenetViewerUrl={doenetViewerUrl}
      />
    </Box>
  );

  const otherEditor = (
    <Box height="100%">
      <Flex
        width="100%"
        height="30px"
        backgroundColor="doenet.mainGray"
        paddingLeft="10px"
        alignItems="center"
      >
        <Heading as="h3" size="sm">
          {activityCompareChanged && (
            <Text fontSize="small" marginRight="5px" as="span">
              &#x1f534;
            </Text>
          )}
          {compareRelation === "remix" ? "Remixed activity" : "Remix source"}:
        </Heading>
        <Text
          noOfLines={1}
          marginLeft="5px"
          marginRight="5px"
          fontStyle="italic"
        >
          {activityCompare.name}&nbsp;
        </Text>
        by
        <Text noOfLines={1} marginLeft="5px">
          {createNameNoTag(activityCompare.owner)}
        </Text>
      </Flex>
      <DoenetEditor
        height="100%"
        width="100%"
        doenetML={activityCompare.doenetML}
        doenetmlVersion={activityCompare.doenetmlVersion.fullVersion}
        border="none"
        viewerLocation="bottom"
        readOnly={true}
        showErrorsWarnings={false}
        showResponses={false}
        doenetViewerUrl={doenetViewerUrl}
      />
    </Box>
  );

  const editorPair = (
    <PanelPair
      panelA={currentEditor}
      panelB={otherEditor}
      height={`calc(100vh - 80px)`}
    />
  );

  return (
    <>
      {basicUpdateActionsModel}
      <Grid
        background="doenet.lightBlue"
        minHeight="calc(100vh - 40px)" //40px header height
        templateAreas={`"header"
      "centerContent"
      `}
        templateRows="40px auto"
        position="relative"
      >
        <GridItem
          area="header"
          position="fixed"
          height="40px"
          background="doenet.canvas"
          width="100%"
          zIndex="500"
        >
          <Grid
            templateAreas={`"leftControls label rightControls"`}
            templateColumns={{
              base: "5px 1fr 160px",
              sm: "10px 1fr 165px",
              md: "165px 1fr 165px",
            }}
            width="100%"
          >
            <GridItem area="leftControls" height="40px" alignContent="center">
              <Show above="md">
                <Box width="50px" marginLeft="15px">
                  <ChakraLink
                    as={ReactRouterLink}
                    to={".."}
                    style={{
                      color: "var(--mainBlue)",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(-1);
                    }}
                  >
                    {" "}
                    &lt; Back
                  </ChakraLink>
                </Box>
              </Show>
            </GridItem>
            <GridItem area="label">
              <Flex justifyContent="center" alignItems="center" height="40px">
                <Text marginRight="5px" fontWeight="bold">
                  Compare:
                </Text>{" "}
                {typeIcon}
                <Tooltip label={activity.name} openDelay={500}>
                  <Text noOfLines={1}>{activity.name}</Text>
                </Tooltip>
                &nbsp;&mdash;&nbsp;
                {typeIcon}
                <Tooltip label={activityCompare.name} openDelay={500}>
                  <Text noOfLines={1}>{activityCompare.name}</Text>
                </Tooltip>
              </Flex>
            </GridItem>
            <GridItem
              area="rightControls"
              display="flex"
              justifyContent="flex-end"
              alignItems="center"
            >
              <Box mr={{ base: "5px", sm: "10px" }}>
                <Tooltip
                  label={updateMessage}
                  openDelay={500}
                  placement="bottom-end"
                >
                  <Button
                    size="xs"
                    marginLeft="10px"
                    aria-label={updateMessage}
                    isDisabled={activityAtCompare && !activityCompareChanged}
                    marginRight="10px"
                    onClick={basicActionsOnOpen}
                    colorScheme="blue"
                  >
                    {activityCompareChanged && <>&#x1f534; </>}
                    {activityAtCompare && !activityCompareChanged ? (
                      <>Already matches</>
                    ) : (
                      <>Possible update actions</>
                    )}
                  </Button>
                </Tooltip>
              </Box>
            </GridItem>
          </Grid>
        </GridItem>

        <GridItem area="centerContent">{editorPair}</GridItem>
      </Grid>
    </>
  );
}
