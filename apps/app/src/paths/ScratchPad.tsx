import { ComponentType, useCallback, useEffect, useRef, useState } from "react";
import {
  redirect,
  useLoaderData,
  useOutletContext,
  useNavigate,
  useFetcher,
} from "react-router";
import {
  ContentDescription,
  DoenetmlVersion,
  UserInfoWithEmail,
} from "../types";
import { DoenetEditor } from "@doenet/doenetml-iframe";
import axios from "axios";
import defaultSource from "../assets/scratchPadDefault.doenet?raw";
import multipleChoice from "../assets/multipleChoiceExamples.doenet?raw";
import mathAnswers from "../assets/mathAnswerExamples.doenet?raw";
import graphicalAnswers from "../assets/graphicalAnswerExamples.doenet?raw";
import accessibilityPointers from "../assets/accessibilityPointers.doenet?raw";
import mathTags from "../assets/mathTags.doenet?raw";
import pretzelDemo from "../assets/pretzelDemo.doenet?raw";

import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  Flex,
  Link as ChakraLink,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
  Tooltip,
  HStack,
  ButtonGroup,
  IconButton,
} from "@chakra-ui/react";
import { SiteContext } from "./SiteHeader";
import {
  SaveDoenetmlAndReportFinish,
  type CreateContentResponse,
} from "../popups/SaveDoenetmlAndReportFinish";
import { LuCircleHelp } from "react-icons/lu";
import { getDiscourseUrl } from "../utils/discourse";
import { MenuDismissOverlay } from "../components/MenuDismissOverlay";
import { useIframeMenuDismissOverlay } from "../utils/useIframeMenuDismissOverlay";
import { IFRAME_MENU_IDS } from "../utils/iframeMenuIds";
import { useControlledMenu } from "../utils/useControlledMenu";
import { useMenuTooltipSuppression } from "../utils/useMenuTooltipSuppression";

export type DocumentEditorProps = {
  source: string;
  doenetmlVersion: DoenetmlVersion;
  sourceChangedCallback?: (newSource: string) => void;
};

type ScratchPadEditorComponent = ComponentType<DocumentEditorProps>;

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  const doenetML = url.searchParams.get("doenetml");
  if (doenetML) {
    try {
      // Save requested DoenetML in localStorage
      // and then reload page without doenetml param
      // so that reloading the page won't reset to the original DoenetML
      localStorage.setItem("scratchPad", doenetML);
      return redirect(`/scratchPad`);
    } catch (e) {
      console.error(e);
    }
  }

  const contentId = url.searchParams.get("contentId");
  if (contentId) {
    try {
      const { data } = await axios.get(
        `/api/activityEditView/getContentSource/${contentId}`,
      );

      // Save DoenetML source from the contentId in localStorage
      // and then reload page without contentId param
      // so that reloading the page won't reset to the original DoenetML
      localStorage.setItem("scratchPad", data.source);
      return redirect(`/scratchPad`);
    } catch (e) {
      console.error(e);
    }
  }

  const {
    data: { defaultDoenetmlVersion },
  } = await axios.get(`/api/info/getDefaultDoenetmlVersion`);

  let source = "";
  try {
    source = localStorage.getItem("scratchPad") || defaultSource;
  } catch (e) {
    console.error(e);
  }

  return {
    doenetmlVersion: defaultDoenetmlVersion,
    source,
  };
}

/**
 * This page allows you edit a scratch pad of DoenetML to explore the features of DoenetML.
 */
export function ScratchPad() {
  const { doenetmlVersion, source } = useLoaderData() as {
    doenetmlVersion: DoenetmlVersion;
    source: string;
  };

  useEffect(() => {
    document.title = `Scratch pad - Doenet`;
  }, []);

  const { user, setAddTo } = useOutletContext<SiteContext>();
  const discussHref = getDiscourseUrl(user);

  const navigate = useNavigate();

  return (
    <ScratchPadComponent
      doenetmlVersion={doenetmlVersion}
      initialSource={source}
      user={user}
      setAddTo={setAddTo}
      navigate={navigate}
      discussHref={discussHref}
    />
  );
}

export function ScratchPadComponent({
  doenetmlVersion,
  initialSource,
  user,
  setAddTo,
  navigate,
  discussHref,
  editorComponent = DocumentEditor,
}: {
  doenetmlVersion: DoenetmlVersion;
  initialSource: string;
  user?: UserInfoWithEmail;
  setAddTo: (value: ContentDescription | null) => void;
  navigate: (path: string) => void;
  discussHref: string;
  editorComponent?: ScratchPadEditorComponent;
}) {
  const fetcher = useFetcher<CreateContentResponse>();
  const EditorComponent = editorComponent;

  const [source, setSource] = useState(initialSource);
  const [resetNum, setResetNum] = useState(0);
  const currentSourceRef = useRef(initialSource);

  const updateSource = useCallback((nextSource: string) => {
    currentSourceRef.current = nextSource;
    setSource(nextSource);
  }, []);

  const updateCurrentSource = useCallback((nextSource: string) => {
    currentSourceRef.current = nextSource;
  }, []);

  const {
    isOpen: saveDialogIsOpen,
    onOpen: saveDialogOnOpen,
    onClose: saveDialogOnClose,
  } = useDisclosure();

  const { anyMenuOpen, getMenuControl } = useIframeMenuDismissOverlay();
  const helpMenuControl = useControlledMenu(
    getMenuControl,
    IFRAME_MENU_IDS.scratchPadHelp,
  );
  const loadMenuControl = useControlledMenu(
    getMenuControl,
    IFRAME_MENU_IDS.scratchPadLoad,
  );
  // Menu + Tooltip share a trigger; use shared suppression so tooltip
  // does not persist/re-open during menu close focus/hover transitions.
  const {
    suppressTooltip: suppressHelpTooltip,
    handleMenuOpen: handleHelpMenuOpen,
    handleMenuClose: handleHelpMenuClose,
    handleTriggerMouseEnter: handleHelpMouseEnter,
    setTriggerRef: setHelpTriggerRef,
  } = useMenuTooltipSuppression({
    onOpen: helpMenuControl.menuProps.onOpen,
    onClose: helpMenuControl.menuProps.onClose,
  });

  const loadScratchPadSource = useCallback(
    (nextSource: string, removeFromLocalStorage = false) => {
      try {
        if (removeFromLocalStorage) {
          localStorage.removeItem("scratchPad");
        } else {
          localStorage.setItem("scratchPad", nextSource);
        }
      } catch (e) {
        console.error(e);
      }

      updateSource(nextSource);
      // We update reset num to make sure editor updates.
      setResetNum((was) => was + 1);
    },
    [updateSource],
  );

  const saveDocumentDialog = user && (
    <SaveDoenetmlAndReportFinish
      isOpen={saveDialogIsOpen}
      onClose={saveDialogOnClose}
      DoenetML={currentSourceRef.current}
      documentName={"Scratch Pad Document"}
      navigate={navigate}
      user={user}
      setAddTo={setAddTo}
      fetcher={fetcher}
    />
  );

  const loadButton = (
    <Menu {...loadMenuControl.menuProps}>
      <MenuButton
        as={Button}
        size="sm"
        colorScheme="blue"
        data-test="Load Button"
      >
        <Text>Load</Text>
      </MenuButton>
      <MenuList data-test="ScratchPad Load Menu List">
        <MenuItem
          data-test="Add Default Button"
          onClick={() => {
            loadScratchPadSource(defaultSource, true);
          }}
        >
          Scratch Pad Welcome
        </MenuItem>
        <MenuItem
          data-test="Add Multiple Choice Examples Button"
          onClick={() => {
            loadScratchPadSource(multipleChoice);
          }}
        >
          Multiple Choice Examples
        </MenuItem>
        <MenuItem
          data-test="Add Math Answer Examples Button"
          onClick={() => {
            loadScratchPadSource(mathAnswers);
          }}
        >
          Math Answer Examples
        </MenuItem>
        <MenuItem
          data-test="Add Graphical Answer Examples Button"
          onClick={() => {
            loadScratchPadSource(graphicalAnswers);
          }}
        >
          Graphical Answer Examples
        </MenuItem>
        <MenuItem
          data-test="Add Accessibility Pointers Button"
          onClick={() => {
            loadScratchPadSource(accessibilityPointers);
          }}
        >
          Accessibility Pointers
        </MenuItem>
        <MenuItem
          data-test="Add Math Tags Button"
          onClick={() => {
            loadScratchPadSource(mathTags);
          }}
        >
          Mathematical Tags In Doenet
        </MenuItem>
        <MenuItem
          data-test="Add Pretzel Demo Button"
          onClick={() => {
            loadScratchPadSource(pretzelDemo);
          }}
        >
          Pretzel Demo
        </MenuItem>
      </MenuList>
    </Menu>
  );

  const helpButton = (
    <Menu
      isOpen={helpMenuControl.menuProps.isOpen}
      onOpen={handleHelpMenuOpen}
      onClose={handleHelpMenuClose}
    >
      <Tooltip
        label="Help"
        openDelay={300}
        placement="bottom-end"
        isDisabled={suppressHelpTooltip}
      >
        <MenuButton
          as={IconButton}
          ref={setHelpTriggerRef}
          icon={<LuCircleHelp />}
          variant="ghost"
          fontSize="1.3rem"
          size="xs"
          width="30px"
          height="35px"
          aria-label="Help"
          onMouseEnter={handleHelpMouseEnter}
        />
      </Tooltip>
      <MenuList data-test="ScratchPad Help Menu List">
        <MenuItem as={ChakraLink} href="https://docs.doenet.org" isExternal>
          Documentation
        </MenuItem>
        <MenuItem as={ChakraLink} href={discussHref} isExternal>
          Ask a question
        </MenuItem>
      </MenuList>
    </Menu>
  );

  const saveButton = user && (
    <Button
      data-test="Save to Document"
      colorScheme="blue"
      size="sm"
      marginLeft="10px"
      onClick={() => {
        saveDialogOnOpen();
      }}
    >
      Save to Document
    </Button>
  );

  const scratchPadMessage = (
    <Alert status="warning" height="40px">
      <AlertIcon />
      <AlertTitle lineHeight="1em">Scratch Pad</AlertTitle>
      <AlertDescription>
        <Flex alignItems="center" lineHeight="1em">
          <Box>Your changes are not permanently saved.</Box>
        </Flex>
      </AlertDescription>
    </Alert>
  );

  return (
    <>
      {saveDocumentDialog}
      <HStack
        position="fixed"
        top="40px"
        height="40px"
        background="orange.100"
        width="100%"
        pr="10px"
        zIndex="300"
      >
        {scratchPadMessage}
        <ButtonGroup spacing="5px">{helpButton}</ButtonGroup>
        <ButtonGroup spacing="5px" pl="10px">
          {loadButton}
          {saveButton}
        </ButtonGroup>
      </HStack>
      <Box
        position="absolute"
        top={"80px"}
        left="0"
        right="0"
        bottom="0"
        background="doenet.lightBlue"
        overflow="auto"
      >
        {/*
          Dismiss layer used for iframe-safe menu close behavior.
        */}
        {anyMenuOpen && (
          <MenuDismissOverlay dataTest="ScratchPad Menu Dismiss Overlay" />
        )}
        <EditorComponent
          source={source}
          doenetmlVersion={doenetmlVersion}
          key={resetNum}
          sourceChangedCallback={updateCurrentSource}
        />
      </Box>
    </>
  );
}

function DocumentEditor({
  source,
  doenetmlVersion,
  sourceChangedCallback,
}: DocumentEditorProps) {
  const textEditorDoenetML = useRef(source);
  const savedDoenetML = useRef(source);

  const handleSaveDoc = useCallback(async () => {
    if (savedDoenetML.current === textEditorDoenetML.current) {
      return;
    }

    const newDoenetML = textEditorDoenetML.current;

    try {
      //Save in localStorage
      localStorage.setItem("scratchPad", newDoenetML);

      savedDoenetML.current = newDoenetML;
    } catch (e) {
      console.error(e);
    }
  }, []);

  // save draft when leave page
  useEffect(() => {
    return () => {
      handleSaveDoc();
    };
  }, [handleSaveDoc]);

  const baseUrl = window.location.protocol + "//" + window.location.host;
  const doenetViewerUrl = `${baseUrl}/activityViewer`;

  return (
    <DoenetEditor
      height="100%"
      width="100%"
      doenetML={textEditorDoenetML.current}
      doenetmlChangeCallback={() => {
        handleSaveDoc();
      }}
      immediateDoenetmlChangeCallback={(newDoenetML: string) => {
        textEditorDoenetML.current = newDoenetML;
        sourceChangedCallback?.(newDoenetML);
      }}
      doenetmlVersion={doenetmlVersion.fullVersion}
      border="none"
      doenetViewerUrl={doenetViewerUrl}
    />
  );
}
