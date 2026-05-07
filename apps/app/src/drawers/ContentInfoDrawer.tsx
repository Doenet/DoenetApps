import { RefObject, useEffect, useState } from "react";
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { ActivityRemixItem, Content, License } from "../types";
import { GeneralContentInfo } from "../drawerTabs/GeneralContentInfo";
import { ClassificationInfo } from "../drawerTabs/ClassificationInfo";
import axios from "axios";
import { processRemixes } from "../utils/processRemixes";
import { RemixSources } from "../drawerTabs/RemixSources";
import { Remixes } from "../drawerTabs/Remixes";

export function ContentInfoDrawer({
  isOpen,
  onClose,
  finalFocusRef,
  contentData,
  displayTab = "general",
  allLicenses,
}: {
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: RefObject<HTMLElement | null>;
  contentData: Content;
  displayTab?: "general" | "classifications";
  allLicenses: License[];
}) {
  let initialTabIndex: number;
  switch (displayTab) {
    case "general": {
      initialTabIndex = 0;
      break;
    }
    case "classifications": {
      initialTabIndex = 1;
      break;
    }
  }

  const [tabIndex, setTabIndex] = useState(initialTabIndex);

  useEffect(() => {
    setTabIndex(initialTabIndex);
  }, [displayTab, initialTabIndex, isOpen]);

  // TODO: this next section (until return statement) is copied almost verbatim from ShareDrawer.tsx
  // Refactor to avoid code duplication

  const [contributorHistory, setContributorHistory] = useState<
    ActivityRemixItem[]
  >([]);
  const [haveChangedHistoryItem, setHaveChangedHistoryItem] = useState(false);
  const [remixes, setRemixes] = useState<ActivityRemixItem[]>([]);

  useEffect(() => {
    if (!isOpen || contentData.type === "folder") {
      return;
    }

    const abortController = new AbortController();
    let isCancelled = false;

    async function getHistoryAndRemixes() {
      try {
        const { data } = await axios.get(
          `/api/remix/getRemixSources/${contentData.contentId}`,
          { signal: abortController.signal },
        );

        if (isCancelled) {
          return;
        }

        const hist = processRemixes(data.remixSources);
        setContributorHistory(hist);

        const haveChanged = hist.some((dhi) => dhi.originContent.changed);
        setHaveChangedHistoryItem(haveChanged);

        const { data: data2 } = await axios.get(
          `/api/remix/getRemixes/${contentData.contentId}`,
          { signal: abortController.signal },
        );

        if (isCancelled) {
          return;
        }

        const remixes = processRemixes(data2.remixes);
        setRemixes(remixes);
      } catch (_e) {
        if (abortController.signal.aborted || isCancelled) {
          return;
        }

        setContributorHistory([]);
        setHaveChangedHistoryItem(false);
        setRemixes([]);
      }
    }

    getHistoryAndRemixes();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [isOpen, contentData.type, contentData.contentId]);

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
        <DrawerCloseButton data-test="Close Settings Button" />
        <DrawerHeader textAlign="center" height="70px">
          {contentData.type === "folder" ? "Folder" : "Activity"} Information
          <Tooltip label={contentData.name}>
            <Text fontSize="smaller" noOfLines={1}>
              {contentData.name}
            </Text>
          </Tooltip>
        </DrawerHeader>

        <DrawerBody>
          <Tabs index={tabIndex} onChange={(index) => setTabIndex(index)}>
            <TabList>
              <Tab data-test="General Tab">General</Tab>

              {contentData.type !== "folder" ? (
                <Tab data-test="Classifications">
                  Classifications ({contentData.classifications.length})
                </Tab>
              ) : null}
              {contentData.type !== "folder" ? (
                <>
                  <Tab data-test="Remix Sources Tab">
                    Remix Sources{" "}
                    {contributorHistory !== null
                      ? `(${contributorHistory.length})`
                      : null}
                    {haveChangedHistoryItem ? "*" : null}
                  </Tab>
                  <Tab data-test="Remixes Tab">
                    Remixes {remixes !== null ? `(${remixes.length})` : null}
                  </Tab>
                </>
              ) : null}
            </TabList>
            <Box height="calc(100vh - 130px)">
              <TabPanels height="100%">
                <TabPanel height="100%">
                  <GeneralContentInfo
                    contentData={contentData}
                    allLicenses={allLicenses}
                  />
                </TabPanel>
                {contentData.type !== "folder" ? (
                  <TabPanel overflowY="hidden" height="100%">
                    <ClassificationInfo contentData={contentData} />
                  </TabPanel>
                ) : null}
                {contentData.type !== "folder" ? (
                  <TabPanel>
                    <RemixSources contributorHistory={contributorHistory} />
                  </TabPanel>
                ) : null}
                {contentData.type !== "folder" ? (
                  <TabPanel>
                    <Remixes remixes={remixes} />
                  </TabPanel>
                ) : null}
              </TabPanels>
            </Box>
          </Tabs>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
