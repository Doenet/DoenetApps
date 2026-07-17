import {
  Button,
  Box,
  Text,
  Flex,
  useDisclosure,
  useToast,
  MenuItem,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  IconButton,
  Input,
  HStack,
  Show,
  Spinner,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import {
  Form,
  Link as ReactRouterLink,
  redirect,
  useLoaderData,
  useFetcher,
  useOutletContext,
  useNavigate,
  useRevalidator,
} from "react-router";
import axios from "axios";
import { MdClose, MdContentCopy, MdOutlineSearch } from "react-icons/md";
import { FaPlus } from "react-icons/fa";
import { LuDessert } from "react-icons/lu";

import { CardContent } from "../widgets/Card";
import CardList from "../widgets/CardList";
import { MoveCopyContent } from "../popups/MoveCopyContent";
import { Content, ContentType, LicenseCode, UserInfo } from "../types";
import {
  EditImageAttribution,
  emptyImageAttribution,
  type ImageAttributionFormValues,
} from "../popups/EditImageAttribution";
import { buildImageTag } from "../utils/imageTag";
import { createNameNoTag } from "../utils/names";

import { getAllowedParentTypes, getIconInfo } from "../utils/activity";
import { CreateLocalContent } from "../popups/CreateLocalContent";
import { DeleteContent } from "../popups/DeleteContent";
import { CopyContentAndReportFinish } from "../popups/CopyContentAndReportFinish";
import { SiteContext } from "../paths/SiteHeader";
import { ActivateAuthorMode } from "../popups/ActivateAuthorMode";
import { formatAssignmentBlurb } from "../utils/assignment";
import { editorUrl } from "../utils/url";
import { ShareModal } from "../features/sharing";
import { NameBar } from "../widgets/NameBar";
import {
  ActionBar,
  Action as ActionBarActions,
  Context as ActionBarContext,
} from "../widgets/ActionBar";
import { useCardSelections } from "../hooks/cardSelections";
import { useCardMovement } from "../hooks/cardMovement";
import { CreateContentMenu } from "../dropdowns/CreateContentMenu";
import {
  configAddFromContentList,
  configOrganizeContentList,
} from "../utils/actionBarConfig";

export async function loader({ params, request }: any) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  let data;
  if (q) {
    const results = await axios.get(
      `/api/contentList/searchMyContent/${params.userId}/${params.parentId ?? ""}?query=${q}`,
    );
    data = results.data;
  } else {
    const results = await axios.get(
      `/api/contentList/getMyContent/${params.userId}/${params.parentId ?? ""}`,
    );
    data = results.data;
  }

  if (data.notMe) {
    return redirect(
      `/sharedActivities/${params.userId}${params.parentId ? "/" + params.parentId : ""}`,
    );
  }

  return {
    parentId: params.parentId ? params.parentId : null,
    content: data.content,
    userId: params.userId,
    parent: data.parent,
    query: q,
  };
}

export function Activities() {
  const { parentId, content, userId, parent, query } = useLoaderData() as {
    parentId: string | null;
    content: Content[];
    userId: string;
    parent: Content | null;
    query: string | null;
  };
  const [settingsContentId, setSettingsContentId] = useState<string | null>(
    null,
  );

  const nameBarFetcher = useFetcher();

  const {
    isOpen: createFolderIsOpen,
    onOpen: createFolderOnOpen,
    onClose: createFolderOnClose,
  } = useDisclosure();

  const {
    isOpen: deleteContentIsOpen,
    onOpen: deleteContentOnOpen,
    onClose: deleteContentOnClose,
  } = useDisclosure();

  const {
    isOpen: shareFolderIsOpen,
    onOpen: shareFolderOnOpen,
    onClose: shareFolderOnClose,
  } = useDisclosure();

  // The image-attribution modal is shown either to collect a license for a
  // freshly picked file before uploading it (`create`), or to edit an existing
  // image's attribution (`edit`). A license is mandatory in both, so an
  // unlicensed image is never created.
  // The image file awaiting a license before its upload completes. Editing the
  // attribution of an already-uploaded image now lives on the image viewer page.
  const [uploadTarget, setUploadTarget] = useState<{ file: File } | null>(null);

  const { addTo, setAddTo, user } = useOutletContext<SiteContext>();

  // refs to the menu button of each content card,
  // which should be given focus when drawers are closed
  const cardMenuRefs = useRef<HTMLButtonElement[]>([]);

  const finalFocusRef = useRef<HTMLElement | null>(null);

  const [haveContentSpinner, setHaveContentSpinner] = useState(false);

  const [searchString, setSearchString] = useState(query ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const haveQuery = Boolean(query);

  useEffect(() => {
    setHaveContentSpinner(false);
  }, [content]);

  const cardSelections = useCardSelections({
    ids: content.map((c) => c.contentId),
  });
  const cardMovement = useCardMovement({
    selectedCards: cardSelections.ids,
    ids: content.map((c) => c.contentId),
  });

  const selectedContentDescriptions = content.filter((c) =>
    cardSelections.ids.has(c.contentId),
  );

  const [moveCopyData, setMoveCopyData] = useState<{
    contentId: string;
    name: string;
    type: ContentType;
    isPublic: boolean;
    isShared: boolean;
    sharedWith: UserInfo[];
    licenseCode: LicenseCode | null;
  }>({
    contentId: "",
    name: "",
    type: "singleDoc",
    isPublic: false,
    isShared: false,
    sharedWith: [],
    licenseCode: null,
  });

  const {
    isOpen: moveCopyContentIsOpen,
    onOpen: moveCopyContentOnOpen,
    onClose: moveCopyContentOnClose,
  } = useDisclosure();

  useEffect(() => {
    document.title = `${parent?.name ?? "My Activities"} - Doenet`;
  }, [parent]);

  // Used for card actions (move up/down, duplicate)
  const contentActionsFetcher = useFetcher();

  // Used for creating new documents and problem sets
  const createContentFetcher = useFetcher();

  // Used by MoveCopyContent modal
  const moveContentFetcher = useFetcher();

  // Used by CreateLocalContent modal (folder creation)
  const createFolderFetcher = useFetcher();

  // Used by CopyContentAndReportFinish modal
  const copyContentFetcher = useFetcher();

  // Used by ActivateAuthorMode modal
  const authorModeFetcher = useFetcher();

  // Used by AddContentToMenu component
  // const addContentFetcher = useFetcher();

  // Used by CreateContentMenu component
  const createContentMenuCreateFetcher = useFetcher();
  const createContentMenuSaveNameFetcher = useFetcher();

  // Used by DeleteContent modal
  const deleteContentFetcher = useFetcher();

  const navigate = useNavigate();

  const { iconImage: folderIcon, iconColor: folderColor } = getIconInfo(
    "folder",
    false,
  );

  const parentName = parent?.name ?? "My Activities";

  const titleIcon = (
    <Tooltip label={parentName}>
      <Box>
        <Icon
          as={parent ? folderIcon : LuDessert}
          color={parent ? folderColor : "black"}
          boxSizing="content-box"
          width="24px"
          height="24px"
          mr="0.5rem"
          verticalAlign="middle"
          aria-label={"Folder"}
        />
      </Box>
    </Tooltip>
  );

  let contentData: Content | undefined;
  if (settingsContentId) {
    const index = content.findIndex(
      (obj) => obj.contentId == settingsContentId,
    );
    if (index != -1) {
      contentData = content[index];
      finalFocusRef.current = cardMenuRefs.current[index];
    } else {
      //Throw error not found
    }
  }

  function createNewDocument() {
    setHaveContentSpinner(true);
    createContentFetcher.submit(
      {
        path: "updateContent/createContent",
        redirectNewContentId: true,
        parentId,
        contentType: "singleDoc",
      },
      { method: "post", encType: "application/json" },
    );
  }

  const toast = useToast();
  const revalidator = useRevalidator();
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Picking a file doesn't upload it yet: we first open the attribution modal to
  // require a license, then upload once the user confirms (see
  // `uploadImageWithAttribution`). This guarantees no unlicensed image is
  // created.
  function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // No card anchor for the upload flow; clear any stale one so focus restores
    // to the element that had it (rather than an unrelated card's menu button).
    finalFocusRef.current = null;
    setUploadTarget({ file });
  }

  // Runs the two-step upload with the license/attribution the user supplied.
  // Errors propagate so the modal keeps itself open and shows the message.
  async function uploadImageWithAttribution(
    file: File,
    values: ImageAttributionFormValues,
  ) {
    setHaveContentSpinner(true);
    try {
      const initRes = await axios.post<{
        uploadKey: string;
        uploadUrl: string;
      }>("/api/media/image/init", {
        mimeType: file.type,
        sizeBytes: file.size,
      });
      const { uploadKey, uploadUrl } = initRes.data;

      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });

      await axios.post("/api/media/image/complete", {
        uploadKey,
        parentId: parentId ?? null,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        ...values,
      });

      revalidator.revalidate();
      toast({
        title: "Image uploaded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setHaveContentSpinner(false);
    }
  }

  // Shown when the user picks an image to upload: they must license it before
  // the upload completes. Editing an existing image's attribution happens on the
  // image viewer page instead.
  const attributionModal = uploadTarget ? (
    <EditImageAttribution
      isOpen={true}
      onClose={() => setUploadTarget(null)}
      initial={emptyImageAttribution}
      imageSource={null}
      headerLabel="License this image"
      submitLabel="Upload"
      defaultAuthorName={user ? createNameNoTag(user) : undefined}
      finalFocusRef={finalFocusRef}
      onSubmit={(values) =>
        uploadImageWithAttribution(uploadTarget.file, values)
      }
    />
  ) : null;

  const moveCopyContentModal = (
    <MoveCopyContent
      isOpen={moveCopyContentIsOpen}
      onClose={moveCopyContentOnClose}
      fetcher={moveContentFetcher}
      onNavigate={(url) => navigate(url)}
      sourceContent={[moveCopyData]}
      userId={userId}
      currentParentId={parentId}
      finalFocusRef={finalFocusRef}
      allowedParentTypes={getAllowedParentTypes([moveCopyData.type])}
      action="Move"
    />
  );

  const createFolderModal = (
    <CreateLocalContent
      isOpen={createFolderIsOpen}
      onClose={createFolderOnClose}
      contentType="folder"
      parentId={parentId}
      fetcher={createFolderFetcher}
      finalFocusRef={finalFocusRef}
    />
  );

  const deleteModal =
    contentData && settingsContentId ? (
      <DeleteContent
        isOpen={deleteContentIsOpen}
        onClose={deleteContentOnClose}
        content={contentData}
        finalFocusRef={finalFocusRef}
        fetcher={deleteContentFetcher}
      />
    ) : null;

  const {
    isOpen: copyDialogIsOpen,
    onOpen: copyDialogOnOpen,
    onClose: copyDialogOnClose,
  } = useDisclosure();

  const copyContentModal =
    addTo !== null ? (
      <CopyContentAndReportFinish
        isOpen={copyDialogIsOpen}
        onClose={copyDialogOnClose}
        contentIds={[...cardSelections.ids]}
        desiredParent={addTo}
        action="Add"
        setAddTo={setAddTo}
        user={user ?? null}
        fetcher={copyContentFetcher}
        onNavigate={navigate}
      />
    ) : null;

  const {
    isOpen: authorModePromptIsOpen,
    onOpen: authorModePromptOnOpen,
    onClose: authorModePromptOnClose,
  } = useDisclosure();

  const {
    isOpen: imageAccessPromptIsOpen,
    onOpen: imageAccessPromptOnOpen,
    onClose: imageAccessPromptOnClose,
  } = useDisclosure();

  const imageAccessModal = (
    <Modal isOpen={imageAccessPromptIsOpen} onClose={imageAccessPromptOnClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Image uploads are in early access</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>
            Image uploads are an experimental feature and not yet available on
            every account. If you'd like to try it, ask a Doenet admin at
            info@doenet.org to enable image uploads for your account.
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={imageAccessPromptOnClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  const authorModeModal = (
    <ActivateAuthorMode
      isOpen={authorModePromptIsOpen}
      onClose={authorModePromptOnClose}
      desiredAction="create doc"
      user={user!}
      proceedCallback={createNewDocument}
      fetcher={authorModeFetcher}
    />
  );

  const shareFolderModal = parent && (
    <ShareModal
      contentId={parent.contentId}
      contentType={parent.type}
      modalIsOpen={shareFolderIsOpen}
      closeModal={shareFolderOnClose}
    />
  );

  const createNewButton = (
    <Menu>
      <MenuButton
        as={Button}
        size="sm"
        colorScheme="blue"
        data-test="New Button"
      >
        {haveContentSpinner ? (
          <Spinner size="sm" />
        ) : (
          <HStack>
            <FaPlus />
            <Text>New</Text>
          </HStack>
        )}
      </MenuButton>
      <MenuList>
        <MenuItem
          data-test="Add Document Button"
          onClick={() => {
            if (user?.isAuthor) {
              createNewDocument();
            } else {
              authorModePromptOnOpen();
            }
          }}
        >
          Document {!user?.isAuthor && <>(with source code)</>}
        </MenuItem>
        <MenuItem
          data-test="Add Problem Set Button"
          onClick={() => {
            setHaveContentSpinner(true);
            createContentFetcher.submit(
              {
                path: "updateContent/createContent",
                redirectNewContentId: true,
                parentId,
                contentType: "sequence",
              },
              { method: "post", encType: "application/json" },
            );
          }}
        >
          Problem Set
        </MenuItem>
        <MenuItem
          data-test="Add Folder Button"
          onClick={() => {
            createFolderOnOpen();
          }}
        >
          Folder
        </MenuItem>
        <MenuItem
          data-test="Add Image Button"
          onClick={() => {
            if (user?.canUploadImages) {
              imageInputRef.current?.click();
            } else {
              imageAccessPromptOnOpen();
            }
          }}
        >
          Image
        </MenuItem>
      </MenuList>
    </Menu>
  );

  const hiddenImageInput = (
    <input
      ref={imageInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      style={{ display: "none" }}
      onChange={handleImageFile}
      data-test="Hidden Image Upload Input"
    />
  );

  /**
   * TODO: This is a hack to place arbitrary buttons into the action bar.
   * Move this logic to `actions` once `<AddContentToMenu>` and `<CreateContentMenu>`
   * have been properly refactored to NOT include their initial button UI inside of themselves.
   * See issue #2852
   */
  const FIX_ME_miscellaneous_buttons = addTo ? null : (
    <>
      {/* <AddContentToMenu
        fetcher={addContentFetcher}
        sourceContent={selectedContentDescriptions}
        size="xs"
        colorScheme="blue"
        label="Copy selected to"
        user={user ?? null}
        onNavigate={(url) => navigate(url)}
        setAddTo={setAddTo}
      /> */}
      <Show above="md">
        <CreateContentMenu
          sourceContent={selectedContentDescriptions}
          size="xs"
          label="Create from selected"
          user={user ?? null}
          navigate={navigate}
          createFetcher={createContentMenuCreateFetcher}
          saveNameFetcher={createContentMenuSaveNameFetcher}
        />
      </Show>
    </>
  );

  let activeActionBar: "none" | "normal" | "add to" = "none";
  let actionBarContext: ActionBarContext;
  let actions: ActionBarActions[];

  if (addTo) {
    const config = configAddFromContentList({
      cardSelections,
      addTo,
      setAddTo,
      onAdd: copyDialogOnOpen,
    });

    activeActionBar = "add to";
    actionBarContext = config.context;
    actions = config.actions;
  } else {
    const config = configOrganizeContentList({
      cardSelections,
      cardMovement,
      forceDisableMoveUpAndDown: haveQuery,
      FIX_ME_miscellaneous_buttons,
      onMoveTo: () => {
        const selectedContent = content.find(
          (c) => c.contentId === cardSelections.ids.values().next().value,
        );
        if (selectedContent) {
          setMoveCopyData({
            contentId: selectedContent.contentId,
            name: selectedContent.name,
            type: selectedContent.type,
            isPublic: selectedContent.isPublic,
            isShared: selectedContent.isShared,
            sharedWith: selectedContent.sharedWith,
            licenseCode: selectedContent.licenseCode ?? null,
          });
          moveCopyContentOnOpen();
        }
      },
      onCopy: () => {
        contentActionsFetcher.submit(
          {
            path: "copyMove/copyContent",
            contentIds: [...cardSelections.ids],
            parentId,
            prependCopy: true,
          },
          { method: "post", encType: "application/json" },
        );
      },
      onDelete: () => {
        setSettingsContentId(cardSelections.ids.values().next().value ?? null);
        deleteContentOnOpen();
      },
    });

    activeActionBar = cardSelections.areActive ? "normal" : "none";
    actionBarContext = config.context;
    actions = config.actions;
  }

  const normalActionBar = (
    <ActionBar
      context={actionBarContext}
      actions={actions}
      isActive={activeActionBar === "normal"}
    />
  );

  const addToActionBar = (
    <ActionBar
      context={actionBarContext}
      actions={actions}
      isActive={activeActionBar === "add to"}
    />
  );

  const headingNoSelection = (
    <>
      <NameBar
        contentName={parentName}
        isEditable={parent !== null}
        contentId={parentId}
        leftIcon={titleIcon}
        dataTest="Folder Title"
        fontSizeMode={"folder"}
        fetcher={nameBarFetcher}
      />

      <HStack>
        <Form>
          <HStack gap="1px">
            <Input
              type="search"
              size="sm"
              colorScheme="blue"
              width={{ base: "5rem", md: "10rem", lg: "200px" }}
              ref={searchRef}
              placeholder={parent ? `Search in folder` : `Search my activities`}
              value={searchString}
              name="q"
              onInput={(e) => {
                setSearchString((e.target as HTMLInputElement).value);
              }}
              data-test="Search Input"
            />
            <Tooltip
              label={parent ? `Search in folder` : `Search my activities`}
              placement="bottom-end"
            >
              <IconButton
                size="sm"
                colorScheme="blue"
                icon={<MdOutlineSearch />}
                aria-label={
                  parent ? `Search in folder` : `Search my activities`
                }
                type="submit"
                data-test="Search Button"
              />
            </Tooltip>
          </HStack>
        </Form>

        <HStack gap="7px">
          {createNewButton}
          {hiddenImageInput}
          {parent && (
            <>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={shareFolderOnOpen}
                data-test="Share Folder Button"
              >
                Share
              </Button>
              <Button
                as={ReactRouterLink}
                to={`/students/${parentId}`}
                colorScheme="blue"
                size="sm"
              >
                Students
              </Button>
            </>
          )}
        </HStack>
      </HStack>
    </>
  );

  const HEADING_HEIGHT = "2.5rem";

  const searchResultsHeading = haveQuery ? (
    <Flex
      width="100%"
      background="surfaceMuted"
      fontSize="large"
      alignItems="center"
      padding="5px"
      paddingLeft={[".1em", "1em"]}
      paddingRight={[".1em", "1em"]}
    >
      <Flex width="100%" alignItems="center" ml="2rem">
        {/* left offset to align with card content (checkbox + icon + title padding) */}
        Search results for: {query}
      </Flex>
      <Form>
        <Tooltip label="Close search results" placement="bottom-end">
          <IconButton
            icon={<MdClose />}
            background="surfaceMuted"
            aria-label="Close search results"
            type="submit"
            onClick={() => {
              setSearchString("");
            }}
          />
        </Tooltip>
      </Form>
    </Flex>
  ) : null;

  const emptyMessage = haveQuery
    ? "No Results Found"
    : "Find activities from the Explore tab or create your own with the New button";

  const cardContent: CardContent[] = content.map((activity, position) => {
    const getCardMenuRef = (element: HTMLButtonElement) => {
      cardMenuRefs.current[position] = element;
    };

    let cardLink: string | undefined;
    if (activity.type === "image") {
      cardLink = `/imageDetails/${activity.contentId}`;
    } else if (activity.type === "folder") {
      cardLink = `/activities/${activity.ownerId}/${activity.contentId}`;
    } else if (activity.assignmentInfo) {
      cardLink = `/assignmentData/${activity.contentId}`;
    } else {
      cardLink = editorUrl(activity.contentId, activity.type);
    }

    const inlineActions =
      activity.type === "image" ? (
        <HStack spacing="4px">
          <Button
            ref={getCardMenuRef}
            size="xs"
            variant="outline"
            colorScheme="blue"
            leftIcon={<MdContentCopy />}
            data-test="Copy Image Tag"
            onClick={async () => {
              const tag = buildImageTag(activity);
              try {
                await navigator.clipboard.writeText(tag);
                toast({
                  title: "Image tag copied",
                  status: "success",
                  duration: 3000,
                  isClosable: true,
                });
              } catch {
                toast({
                  title: "Could not copy to clipboard",
                  description: tag,
                  status: "error",
                  duration: 5000,
                  isClosable: true,
                });
              }
            }}
          >
            Copy tag
          </Button>
        </HStack>
      ) : undefined;

    return {
      menuRef: getCardMenuRef,
      content: activity,
      blurb: formatAssignmentBlurb(activity),
      cardLink,
      inlineActions,
    };
  });

  const mainPanel = (
    <CardList
      showOwnerName={false}
      showBlurb={true}
      showPublicStatus={true}
      showActivityCategories={true}
      emptyMessage={emptyMessage}
      cardContent={cardContent}
      includeSelectionBox={true}
      selectedCards={cardSelections.ids}
      onCardSelected={cardSelections.add}
      onCardDeselected={cardSelections.remove}
      disableSelectFor={addTo ? [addTo.contentId] : undefined}
    />
  );

  return (
    <Flex
      data-test="Activities"
      background="surface"
      align="flex-start"
      overflowY="hidden"
      height="100%"
      width="100%"
      flexDir="column"
    >
      <Flex
        height={{ base: `calc(3 * ${HEADING_HEIGHT})`, md: HEADING_HEIGHT }}
        justify="flex-start"
        align={{ base: "left", md: "center" }}
        flexDirection={{ base: "column", md: "row" }}
        px={{ base: "10px", md: "20px" }}
        py="30px"
        gap="5px"
      >
        {activeActionBar === "normal" ? normalActionBar : headingNoSelection}
      </Flex>

      <Box
        width="100%"
        height={{
          base: `calc(100% - 3 * ${HEADING_HEIGHT})`,
          md: `calc(100% - ${HEADING_HEIGHT})`,
        }}
        overflowY="auto"
        px={{ base: "10px", md: "20px" }}
      >
        {moveCopyContentModal}
        {createFolderModal}
        {deleteModal}
        {copyContentModal}
        {authorModeModal}
        {imageAccessModal}
        {shareFolderModal}
        {attributionModal}

        {searchResultsHeading}
        {addToActionBar}

        {mainPanel}
      </Box>
    </Flex>
  );
}
