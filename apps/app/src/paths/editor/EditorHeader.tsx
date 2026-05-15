import { ReactElement, useEffect } from "react";
import {
  useFetcher,
  Link as ReactRouterLink,
  useNavigate,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useOutletContext,
  useSearchParams,
} from "react-router";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  ButtonGroup,
  Flex,
  Icon,
  Link as ChakraLink,
  Show,
  Tooltip,
  useDisclosure,
  IconButton,
  Hide,
  HStack,
  Spacer,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import {
  MdModeEditOutline,
  MdOutlineEditOff,
  MdRemoveRedEye,
} from "react-icons/md";
import { FaHistory, FaCog, FaChevronRight, FaRegFolder } from "react-icons/fa";
import { IoGitBranch } from "react-icons/io5";
import { LuCircleHelp, LuLibraryBig } from "react-icons/lu";

import axios from "axios";
import { AssignmentStatus, ContentType, ContentDescription } from "../../types";
import { contentTypeToName, getIconInfo } from "../../utils/activity";
import { SiteContext } from "../SiteHeader";
import { getDiscourseUrl } from "../../utils/discourse";
import { ActivateAuthorMode } from "../../popups/ActivateAuthorMode";
import { ConfirmAssignModal } from "../../popups/ConfirmAssignModal";
import { ShareMyContentModal } from "../../popups/ShareMyContentModal";
import { NotificationDot } from "../../widgets/NotificationDot";
import type { LibraryEditorData } from "../../widgets/editor/LibraryEditorControls";
import { LibraryEditorControls } from "../../widgets/editor/LibraryEditorControls";
import { editorUrl } from "../../utils/url";
import { NameBar } from "../../widgets/NameBar";
import { loader as settingsLoader } from "./EditorSettingsMode";
import { useIframeMenuDismissOverlay } from "../../utils/useIframeMenuDismissOverlay";
import { MenuDismissOverlay } from "../../components/MenuDismissOverlay";
import { IFRAME_MENU_IDS } from "../../utils/iframeMenuIds";
import { useControlledMenu } from "../../utils/useControlledMenu";
import { useMenuTooltipSuppression } from "../../utils/useMenuTooltipSuppression";
import {
  isBrowsable,
  type Category,
  type CategoryGroup,
} from "@doenet-tools/shared";

export async function loader({
  params,
  request,
}: {
  params: any;
  request: Request;
}) {
  let data;
  try {
    ({ data } = await axios.get(`/api/editor/getEditor/${params.contentId}`));
  } catch (e) {
    // TODO: create corresponding error type
    //@ts-expect-error error is unknown so need to determine its type
    if (e?.response?.data?.error === "Permission denied but can redirect") {
      return redirect(`/activityViewer/${params.contentId}`);
    }
    throw e;
  }

  const contentType: ContentType = data.contentType;
  const pageRoute = request.url.split("/")[0];

  if (pageRoute === "documentEditor" && contentType !== "singleDoc") {
    return redirect(`/compoundEditor/${params.contentId}`);
  } else if (pageRoute === "compoundEditor" && contentType === "singleDoc") {
    return redirect(`/documentEditor/${params.contentId}`);
  }

  const { data: contentDescription } = await axios.get(
    `/api/info/getContentDescription/${params.contentId}`,
  );

  return { contentDescription, ...data };
}

export type EditorContext = SiteContext & {
  contentId: string;
  contentType: ContentType;
  contentName: string;
  isPublic: boolean;
  assignmentStatus: AssignmentStatus;
  inLibrary: boolean;
  headerHeight: string;
};

/**
 * This is the header bar for the editor. All tabs/sub-pages in the editor use its context `EditorContext`. It works for both `/documentEditor` and `/compoundEditor`.
 */
export function EditorHeader() {
  const {
    contentId,
    contentName,
    contentType,
    isPublic,
    assignmentStatus,
    remixSourceHasChanged,
    inLibrary,
    contentDescription,
  } = useLoaderData() as {
    contentId: string;
    contentName: string;
    contentType: ContentType;
    isPublic: boolean;
    assignmentStatus: AssignmentStatus;
    remixSourceHasChanged: boolean;
    inLibrary: boolean;
    contentDescription: ContentDescription;
  };

  const nameBarFetcher = useFetcher();

  const location = useLocation();
  const tab = location.pathname.split("/").pop()?.toLowerCase();

  const [searchParams, _] = useSearchParams();
  const inCurateMode = searchParams.get("curate") === null ? false : true;

  // Loads settings on mount to check if required categories are filled (for "Not browsable" warning)
  const categoryCheckFetcher = useFetcher<typeof settingsLoader>();

  useEffect(() => {
    if (
      isPublic &&
      contentType !== "folder" &&
      categoryCheckFetcher.state === "idle" &&
      !categoryCheckFetcher.data
    ) {
      categoryCheckFetcher.load(editorUrl(contentId, contentType, "settings"));
    }
  }, [isPublic, contentType, contentId, categoryCheckFetcher]);

  // Check if required categories are filled out (similar to ShareMyContentModal)
  const notBrowsable =
    isPublic &&
    categoryCheckFetcher.data &&
    !isBrowsable({
      allCategories: categoryCheckFetcher.data.allCategories as CategoryGroup[],
      categories: categoryCheckFetcher.data.categories as Category[],
    });

  const { anyMenuOpen, getMenuControl } = useIframeMenuDismissOverlay();
  const helpMenuControl = useControlledMenu(
    getMenuControl,
    IFRAME_MENU_IDS.editorHeaderHelp,
  );
  // Shared menu-trigger suppression prevents help tooltip persistence
  // when close timing and focus/hover events overlap.
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

  const notBrowsableMessage = notBrowsable && (
    <Alert status="warning" height="40px">
      <AlertIcon />
      <AlertTitle>Not browsable</AlertTitle>
      <AlertDescription>
        This activity is public but will not be discoverable unless{" "}
        <ChakraLink
          as={ReactRouterLink}
          to={`${editorUrl(contentId, contentType, "settings")}?showRequired`}
          textDecoration="underline"
        >
          required activity categories
        </ChakraLink>{" "}
        are filled out.
      </AlertDescription>
    </Alert>
  );

  // Calculate dynamic header height: site header (40px) + editor header (40px) + optional warning banner (40px)

  const editorHeaderHeight = notBrowsable ? `${40 + 40}px` : "40px";
  const totalHeaderHeight = notBrowsable ? `${40 + 40 + 40}px` : `${40 + 40}px`;

  const context = useOutletContext<SiteContext>();
  const editorContext: EditorContext = {
    ...context,
    contentId,
    contentType,
    isPublic,
    contentName,
    assignmentStatus,
    inLibrary,
    headerHeight: totalHeaderHeight,
  };

  const {
    isOpen: authorModePromptIsOpen,
    onOpen: authorModePromptOnOpen,
    onClose: authorModePromptOnClose,
  } = useDisclosure();

  const {
    isOpen: confirmAssignIsOpen,
    onOpen: confirmAssignOnOpen,
    onClose: confirmAssignOnClose,
  } = useDisclosure();

  // Used by ActivateAuthorMode popup to submit author mode activation
  const authorModeFetcher = useFetcher();

  // Used by ConfirmAssignModal MoveCopyContent to copy/move content
  const assignmentMoveCopyFetcher = useFetcher();

  // Used by ConfirmAssignModal to submit assignment creation
  const assignmentSubmitFetcher = useFetcher();

  // Used by EditAssignmentSettings sub-components within ConfirmAssignModal
  const assignmentMaxAttemptsFetcher = useFetcher();
  const assignmentVariantFetcher = useFetcher();
  const assignmentModeFetcher = useFetcher();

  const navigate = useNavigate();

  // Loads assignment settings when ConfirmAssignModal opens to populate the form
  const assignmentSettingsFetcher = useFetcher<typeof settingsLoader>();
  useEffect(() => {
    if (
      confirmAssignIsOpen &&
      assignmentSettingsFetcher.state === "idle" &&
      !assignmentSettingsFetcher.data
    ) {
      assignmentSettingsFetcher.load(
        editorUrl(contentId, contentType, "settings"),
      );
    }
  }, [confirmAssignIsOpen, assignmentSettingsFetcher, contentId, contentType]);

  const {
    isOpen: shareContentIsOpen,
    onOpen: shareContentOnOpen,
    onClose: shareContentOnClose,
  } = useDisclosure();

  // Fetchers for library editor controls
  const libraryEditorLoadFetcher = useFetcher<LibraryEditorData>({
    key: `${contentId}-library-load`,
  });
  const libraryEditorSubmitFetcher = useFetcher({
    key: `${contentId}-library-submit`,
  });

  const parent = contentDescription.parent;
  const isSubActivity = (parent?.type ?? "folder") !== "folder";
  const authorMode = context.user?.isAuthor || contentType !== "singleDoc";
  const discussHref = getDiscourseUrl(context.user);

  useEffect(() => {
    document.title = `${contentName} - Doenet`;
  }, [contentName]);

  let editLabel: string;
  let editTooltip: string;
  let editIcon: ReactElement<any>;

  if (assignmentStatus === "Unassigned") {
    editIcon = <MdModeEditOutline size={20} />;
    editLabel = "Edit";
    if (authorMode) {
      editTooltip = "Edit activity";
    } else {
      editTooltip = "Turn on author mode to edit";
    }
  } else {
    editIcon = <MdOutlineEditOff size={20} />;
    if (authorMode) {
      if (contentType === "singleDoc") {
        editLabel = "See source code";
        editTooltip = "See read-only view of source code";
      } else {
        editLabel = "See list";
        editTooltip = `See read-only view of documents ${contentType === "sequence" ? "and question banks in the problem set" : "in the question bank"}`;
      }
    } else {
      editLabel = "See source code";
      editTooltip = "Turn on author mode to see read-only view of source code";
    }
  }

  const authorModeModal = (
    <ActivateAuthorMode
      isOpen={authorModePromptIsOpen}
      onClose={authorModePromptOnClose}
      desiredAction="edit"
      assignmentStatus={assignmentStatus}
      user={context.user!}
      proceedCallback={() => {
        navigate(editorUrl(contentId, contentType, "edit", inCurateMode));
      }}
      allowNo={true}
      fetcher={authorModeFetcher}
    />
  );

  const contentTypeName = contentTypeToName[contentType];

  const { iconImage, iconColor } = getIconInfo(contentType, false);

  const typeIcon = (
    <Show above="sm">
      <Tooltip label={contentTypeName}>
        <Box>
          <Icon
            as={iconImage}
            color={iconColor}
            boxSizing="content-box"
            width="24px"
            height="24px"
            mr="0.5rem"
            verticalAlign="middle"
            aria-label={contentTypeName}
          />
        </Box>
      </Tooltip>
    </Show>
  );

  const { iconImage: problemSetIconImage, iconColor: problemSetIconColor } =
    getIconInfo("sequence", false);

  const folderIcon = (
    <Icon
      as={FaRegFolder}
      aria-label="Go to containing folder"
      color="gray.500"
      fontSize="1.1rem"
    />
  );

  const folderIdOrBlank = isSubActivity
    ? (contentDescription.grandparentId ?? "")
    : (parent?.contentId ?? "");
  const folderName = isSubActivity
    ? (contentDescription.grandparentName ?? "My Activities")
    : (parent?.name ?? "My Activities");
  const folderLink = `/activities/${editorContext.user!.userId}/${folderIdOrBlank}`;

  const folder = (
    <Hide below="md">
      <Show below="xl">
        <IconButton
          as={ReactRouterLink}
          icon={folderIcon}
          size="sm"
          variant="ghost"
          aria-label={"Folder"}
          to={folderLink}
          data-test="Folder Breadcrumb Icon"
        />
      </Show>

      <Show above="xl">
        <ChakraLink
          as={ReactRouterLink}
          to={folderLink}
          _hover={{ fontWeight: "bold", textDecoration: "none" }}
        >
          <HStack spacing="0.3rem">
            {folderIcon}
            <Text>{folderName}</Text>
          </HStack>
        </ChakraLink>
      </Show>
      <Box
        ml={{ base: "0rem", xl: "0.5rem" }}
        mr={{ base: "0rem", xl: "0.5rem" }}
      >
        <FaChevronRight color="gray.500" fontSize="0.7rem" />
      </Box>
    </Hide>
  );

  const outerActivityIcon = (
    <Icon
      as={problemSetIconImage}
      color={problemSetIconColor}
      boxSizing="content-box"
      width="20px"
      height="20px"
      verticalAlign="middle"
      aria-label={"Problem set"}
    />
  );

  const outerActivity = isSubActivity && (
    <Hide below="md">
      <Show below="lg">
        <IconButton
          as={ReactRouterLink}
          icon={outerActivityIcon}
          size="sm"
          variant="ghost"
          aria-label={"Problem set"}
          to={`/compoundEditor/${parent!.contentId}/${tab}`}
        />
      </Show>
      <Show above="lg">
        <ChakraLink
          as={ReactRouterLink}
          to={`/compoundEditor/${parent!.contentId}/${tab}`}
          _hover={{ fontWeight: "bold", textDecoration: "none" }}
        >
          <HStack spacing="0.3rem">
            {outerActivityIcon}
            <Text>{parent!.name!}</Text>
          </HStack>
        </ChakraLink>
      </Show>
      <Box
        ml={{ base: "0rem", xl: "0.5rem" }}
        mr={{ base: "0rem", xl: "0.5rem" }}
      >
        <FaChevronRight color="gray.500" fontSize="0.7rem" />
      </Box>
    </Hide>
  );

  const editableName = (
    <NameBar
      contentId={contentId}
      contentName={contentName}
      leftIcon={typeIcon}
      dataTest="Activity Name Editable"
      fetcher={nameBarFetcher}
    />
  );

  const tabButtons = !isSubActivity && (
    <ButtonGroup size="sm" isAttached variant="outline" ml="5px">
      <Tooltip hasArrow label="View Activity">
        <Button
          data-test="View Mode Button"
          isActive={tab === "view"}
          size="sm"
          pr={{ base: "0px", lg: "10px" }}
          leftIcon={<MdRemoveRedEye size={20} />}
          onClick={() => {
            navigate(editorUrl(contentId, contentType, "view", inCurateMode));
          }}
        >
          <Show above="lg">View</Show>
        </Button>
      </Tooltip>
      <Tooltip hasArrow label={editTooltip}>
        <Button
          isActive={tab === "edit"}
          data-test="Edit Mode Button"
          size="sm"
          pr={{ base: "0px", lg: "10px" }}
          leftIcon={editIcon}
          onClick={() => {
            if (authorMode) {
              navigate(editorUrl(contentId, contentType, "edit", inCurateMode));
            } else {
              authorModePromptOnOpen();
            }
            // }
          }}
        >
          <Show above="lg">{editLabel}</Show>
        </Button>
      </Tooltip>
      <Tooltip hasArrow label="Settings">
        <Button
          data-test="Settings Button"
          isActive={tab === "settings"}
          size="sm"
          pr={{ base: "0px", lg: "10px" }}
          leftIcon={<FaCog size={16} />}
          onClick={() => {
            navigate(
              editorUrl(contentId, contentType, "settings", inCurateMode),
            );
          }}
        >
          <Show above="lg">Settings</Show>
        </Button>
      </Tooltip>
    </ButtonGroup>
  );

  const otherPages = (
    <ButtonGroup mr={{ base: "0rem", lg: "1.5rem" }} spacing="0" mt="2px">
      {contentType === "singleDoc" && (
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
          <MenuList data-test="Editor Header Help Menu List">
            <MenuItem as={ChakraLink} href="https://docs.doenet.org" isExternal>
              Documentation
            </MenuItem>
            <MenuItem as={ChakraLink} href={discussHref} isExternal>
              Ask a question
            </MenuItem>
          </MenuList>
        </Menu>
      )}
      {contentType === "singleDoc" && (
        <Tooltip
          label="View edit history"
          openDelay={300}
          placement="bottom-end"
        >
          <IconButton
            as={ReactRouterLink}
            icon={<FaHistory />}
            variant="ghost"
            fontSize="1.0rem"
            size="xs"
            width="30px"
            height="35px"
            aria-label="View edit history"
            to={editorUrl(contentId, contentType, "history", inCurateMode)}
          />
        </Tooltip>
      )}

      {contentType === "singleDoc" && !isSubActivity && (
        <Tooltip
          label="View library status"
          isDisabled={inLibrary}
          openDelay={300}
          placement="bottom-end"
        >
          <IconButton
            as={ReactRouterLink}
            icon={<LuLibraryBig />}
            fontSize="1.2rem"
            variant="ghost"
            size="xs"
            width="30px"
            height="35px"
            aria-label="View library status"
            isDisabled={inLibrary}
            to={editorUrl(contentId, contentType, "library", inCurateMode)}
          />
        </Tooltip>
      )}

      <NotificationDot show={remixSourceHasChanged}>
        <Tooltip label="View remixes" openDelay={300} placement="bottom-end">
          <IconButton
            as={ReactRouterLink}
            icon={<IoGitBranch />}
            fontSize="1.2rem"
            variant="ghost"
            size="xs"
            width="30px"
            height="35px"
            aria-label="View remixes"
            to={editorUrl(contentId, contentType, "remixes", inCurateMode)}
          />
        </Tooltip>
      </NotificationDot>
    </ButtonGroup>
  );

  const actionButtons = !isSubActivity && (
    <ButtonGroup size="sm" mt="4px" mr={{ base: "5px", sm: "10px" }}>
      <Tooltip
        label={
          contentDescription.hasBadVersion &&
          "Creating assignments is not supported (yet) with documents of version 0.6 or 0.7 intermediate."
        }
        placement="bottom-end"
      >
        <Button
          colorScheme="blue"
          isDisabled={inLibrary || contentDescription.hasBadVersion}
          onClick={confirmAssignOnOpen}
          data-test="Create Assignment"
        >
          Create assignment
        </Button>
      </Tooltip>
      <Button
        colorScheme="blue"
        isDisabled={inLibrary}
        onClick={() => shareContentOnOpen()}
        data-test="Share Button"
      >
        Share
      </Button>
    </ButtonGroup>
  );

  return (
    <>
      {authorModeModal}
      <ConfirmAssignModal
        contentDescription={contentDescription}
        userId={context.user!.userId}
        isOpen={confirmAssignIsOpen}
        onClose={confirmAssignOnClose}
        fetcher={assignmentMoveCopyFetcher}
        onNavigate={(url) => navigate(url)}
        maxAttempts={assignmentSettingsFetcher.data?.maxAttempts}
        individualizeByStudent={
          assignmentSettingsFetcher.data?.individualizeByStudent
        }
        mode={assignmentSettingsFetcher.data?.mode}
        maxAttemptsFetcher={assignmentMaxAttemptsFetcher}
        variantFetcher={assignmentVariantFetcher}
        modeFetcher={assignmentModeFetcher}
        assignmentFetcher={assignmentSubmitFetcher}
      />
      <ShareMyContentModal
        contentId={contentId}
        contentType={contentType}
        isOpen={shareContentIsOpen}
        onClose={shareContentOnClose}
      />

      <Box
        position="fixed"
        top="40px"
        height={editorHeaderHeight}
        background="doenet.canvas"
        width="100%"
        zIndex="300"
        borderBottom="1px solid"
        borderColor="doenet.mediumGray"
      >
        <HStack width="100%" ml="0.6rem">
          {folder}
          {outerActivity}
          {editableName}
          {tabButtons}
          <Spacer />
          {otherPages}
          {/* Only show `Create assignment` and `Share` buttons if this is
              not a sub-part of a problem set */}
          {!isSubActivity && actionButtons}
        </HStack>
        {notBrowsableMessage}
      </Box>

      <Box
        position="absolute"
        top={totalHeaderHeight}
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
          <MenuDismissOverlay dataTest="Editor Header Menu Dismiss Overlay" />
        )}
        {inLibrary && inCurateMode ? (
          <Flex width="100%">
            <Outlet context={editorContext} />
            <LibraryEditorControls
              contentId={contentId}
              contentType={contentType}
              loadFetcher={libraryEditorLoadFetcher}
              submitFetcher={libraryEditorSubmitFetcher}
            />
          </Flex>
        ) : (
          <Outlet context={editorContext} />
        )}
      </Box>
    </>
  );
}
