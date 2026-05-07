import { RefObject, useCallback, useEffect, useMemo, useState } from "react";
import {
  ContentDescription,
  Content,
  ContentType,
  LicenseCode,
  UserInfo,
  ProblemSet,
} from "../types";
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Show,
  Spacer,
  Spinner,
  useDisclosure,
} from "@chakra-ui/react";
import { CardContent } from "../widgets/Card";
import {
  FetcherWithComponents,
  Link as ReactRouterLink,
  useOutletContext,
  useNavigate,
} from "react-router";
import { MoveCopyContent } from "../popups/MoveCopyContent";
import CardList from "../widgets/CardList";
import { contentTypeToName, getAllowedParentTypes } from "../utils/activity";
import { CopyContentAndReportFinish } from "../popups/CopyContentAndReportFinish";
import { DeleteContent } from "../popups/DeleteContent";
import { ActivateAuthorMode } from "../popups/ActivateAuthorMode";
import { editorUrl } from "../utils/url";
import { EditorContext } from "../paths/editor/EditorHeader";
import { useCardSelections } from "../hooks/cardSelections";
import { useCardMovement } from "../hooks/cardMovement";
import {
  ActionBar,
  Action as ActionBarActions,
  Context as ActionBarContext,
} from "../widgets/ActionBar";
import {
  configAddFromContentList,
  configOrganizeContentList,
  configReadOnlyContentList,
} from "../utils/actionBarConfig";
import { CreateContentMenu } from "../dropdowns/CreateContentMenu";

export function CompoundActivityEditor({
  activity,
  asViewer = false,
  inLibrary = false,
  fetcher,
  finalFocusRef,
  createContentMenuCreateFetcher,
  createContentMenuSaveNameFetcher,
  deleteContentFetcher,
}: {
  activity: ProblemSet;
  asViewer?: boolean;
  inLibrary?: boolean;
  fetcher: FetcherWithComponents<any>;
  finalFocusRef?: RefObject<HTMLElement | null>;
  createContentMenuCreateFetcher: FetcherWithComponents<any>;
  createContentMenuSaveNameFetcher: FetcherWithComponents<any>;
  deleteContentFetcher: FetcherWithComponents<any>;
}) {
  const contentTypeName = contentTypeToName[activity.type];

  const isAssigned = activity.assignmentInfo
    ? activity.assignmentInfo.assignmentStatus !== "Unassigned"
    : false;

  // Read only: cannot edit anything about this activity
  // Read only structure: cannot add or remove sub-activities
  // NOTE: currently not used as we're limiting curation to single docs
  const readOnly = asViewer || isAssigned;
  const readOnlyStructure = readOnly || inLibrary;

  const { user, addTo, setAddTo, headerHeight } =
    useOutletContext<EditorContext>();

  const navigate = useNavigate();

  const [haveContentSpinner, setHaveContentSpinner] = useState(false);
  useEffect(() => {
    setHaveContentSpinner(false);
  }, [activity]);

  const [contentToDelete, setContentToDelete] =
    useState<ContentDescription | null>(null);

  const [createDocumentParentId, setCreateDocumentParentId] = useState(
    activity.contentId,
  );

  const cardSelections = useCardSelections({
    ids: activity.children.map((c) => c.contentId),
  });
  const cardMovement = useCardMovement({
    selectedCards: cardSelections.ids,
    ids: activity.children.map((c) => c.contentId),
  });

  const selectedContentDescriptions = activity.children.filter((c) =>
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

  const [moveCopyAction, setMoveCopyAction] = useState<"Move" | "Copy">("Move");

  const {
    isOpen: moveCopyContentIsOpen,
    onOpen: moveCopyContentOnOpen,
    onClose: moveCopyContentOnClose,
  } = useDisclosure();

  const moveContentModal = user ? (
    <MoveCopyContent
      isOpen={moveCopyContentIsOpen}
      onClose={moveCopyContentOnClose}
      fetcher={fetcher}
      onNavigate={(url) => navigate(url)}
      sourceContent={[moveCopyData]}
      userId={user.userId}
      currentParentId={activity.contentId}
      finalFocusRef={finalFocusRef}
      allowedParentTypes={getAllowedParentTypes([moveCopyData.type])}
      action={moveCopyAction}
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
        fetcher={fetcher}
        onNavigate={navigate}
      />
    ) : null;

  const {
    isOpen: deleteContentIsOpen,
    onOpen: deleteContentOnOpen,
    onClose: deleteContentOnClose,
  } = useDisclosure();

  const deleteModal = contentToDelete ? (
    <DeleteContent
      isOpen={deleteContentIsOpen}
      onClose={deleteContentOnClose}
      content={contentToDelete}
      finalFocusRef={finalFocusRef}
      fetcher={deleteContentFetcher}
    />
  ) : null;

  const {
    isOpen: authorModePromptIsOpen,
    onOpen: authorModePromptOnOpen,
    onClose: authorModePromptOnClose,
  } = useDisclosure();

  const authorModeModal = (
    <ActivateAuthorMode
      isOpen={authorModePromptIsOpen}
      onClose={authorModePromptOnClose}
      desiredAction="create doc"
      user={user!}
      proceedCallback={() => {
        createNewDocument(createDocumentParentId);
      }}
      fetcher={fetcher}
    />
  );

  // TODO: figure out functions inside hooks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function countCards(content: Content, init = true): number {
    const childCounts =
      content.type === "singleDoc"
        ? 1
        : content.children.reduce((a, c) => a + countCards(c, false), 0);

    if (init) {
      // don't count the initial activity
      return childCounts;
    } else if (content.type === "select" || content.type === "sequence") {
      // for non-initial select and sequence, count the activity and the blank after them
      return childCounts + 2;
    } else {
      // otherwise, count the activity
      return childCounts + 1;
    }
  }

  const numCards = useMemo(() => countCards(activity), [activity, countCards]);

  // TODO: figure out functions inside hooks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function createCardContent(
    content: Content,
    indentLevel = -1,
    positionInParent = 0,
    parentInfo?: {
      contentId: string;
      parent?: string;
      positionInParent: number;
      children: Content[];
    },
  ) {
    const cards: CardContent[] = [];

    // skip the first activity, which doesn't have parent info
    if (parentInfo) {
      cards.push({
        content: content,
        cardLink:
          content.type === "singleDoc"
            ? asViewer
              ? `/activityViewer/${content.contentId}`
              : editorUrl(content.contentId, content.type)
            : undefined,
        indentLevel,
        repeatInProblemSet:
          content.type === "singleDoc" ? content.repeatInProblemSet : undefined,
        updateRepeatInProblemSet: (copies) => {
          fetcher.submit(
            {
              path: "updateContent/updateContentSettings",
              contentId: content.contentId,
              repeatInProblemSet: copies,
            },
            { method: "post", encType: "application/json" },
          );
        },
      });
    }

    if (content.type !== "singleDoc") {
      cards.push(
        ...content.children.flatMap((c, i) =>
          createCardContent(c, indentLevel + 1, i, {
            contentId: content.contentId,
            parent: content.parent?.contentId,
            positionInParent,
            children: content.children,
          }),
        ),
      );
    }

    return cards;
  }

  const cardContent = useMemo(
    () => createCardContent(activity),
    [activity, createCardContent],
  );

  const createNewDocument = useCallback(
    (contentId?: string) => {
      setHaveContentSpinner(true);

      fetcher.submit(
        {
          path: "updateContent/createContent",
          redirectNewContentId: true,
          contentType: "singleDoc",
          parentId: contentId || activity.contentId,
        },
        { method: "post", encType: "application/json" },
      );
    },
    [activity.contentId, fetcher],
  );

  const cardList = (
    <CardList
      showOwnerName={false}
      showBlurb={false}
      showPublicStatus={true}
      showActivityCategories={true}
      showAddButton={!readOnlyStructure}
      emptyMessage={`${contentTypeName} is empty. Add documents here to begin.`}
      cardContent={cardContent}
      includeSelectionBox={user ? true : false}
      selectedCards={cardSelections.ids}
      onCardSelected={cardSelections.add}
      onCardDeselected={cardSelections.remove}
      disableSelectFor={addTo ? [addTo.contentId] : undefined}
      isAuthor={user?.isAuthor}
      addDocumentCallback={(contentId) => {
        if (user?.isAuthor) {
          createNewDocument(contentId);
        } else {
          setCreateDocumentParentId(contentId);
          authorModePromptOnOpen();
        }
      }}
    />
  );

  const cardListHeaderHieght = "40px";

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

  let context: ActionBarContext;
  let actions: ActionBarActions[] = [];

  if (addTo) {
    const config = configAddFromContentList({
      cardSelections,
      addTo,
      setAddTo,
      onAdd: copyDialogOnOpen,
    });

    context = config.context;
    actions = config.actions;
  } else if (readOnly) {
    const config = configReadOnlyContentList({
      cardSelections,
      onCopyTo: () => {
        const selectedContent = activity.children.find(
          (c) => c.contentId === cardSelections.ids.values().next().value,
        );
        if (selectedContent) {
          setMoveCopyAction("Copy");
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
    });

    context = config.context;
    actions = config.actions;
  } else {
    const config = configOrganizeContentList({
      cardSelections,
      cardMovement,
      FIX_ME_miscellaneous_buttons,
      onMoveTo: () => {
        const selectedContent = activity.children.find(
          (c) => c.contentId === cardSelections.ids.values().next().value,
        );
        if (selectedContent) {
          setMoveCopyAction("Move");
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
        fetcher.submit(
          {
            path: "copyMove/copyContent",
            contentIds: [...cardSelections.ids],
            parentId: activity.contentId,
            prependCopy: true,
          },
          { method: "post", encType: "application/json" },
        );
      },
      onDelete: () => {
        const selectedContent = activity.children.find(
          (c) => c.contentId === cardSelections.ids.values().next().value,
        );
        if (selectedContent) {
          setContentToDelete(selectedContent);
          deleteContentOnOpen();
        }
      },
    });

    context = config.context;
    actions = config.actions;
  }

  const selectedItemsActions = (
    <ActionBar
      context={context}
      actions={actions}
      isActive={cardSelections.areActive}
    />
  );

  const heading = (
    <Flex
      backgroundColor="#fff"
      color="#000"
      height={cardListHeaderHieght}
      width="100%"
      textAlign="center"
      paddingX="10px"
      alignItems="center"
    >
      <Spacer />
      {selectedItemsActions}

      <Spacer />
      <Menu>
        <MenuButton
          hidden={readOnlyStructure}
          as={Button}
          size="sm"
          colorScheme="blue"
          data-test="New Button"
        >
          {haveContentSpinner ? <Spinner size="sm" /> : "Add"}
        </MenuButton>
        <MenuList>
          <MenuItem
            as={ReactRouterLink}
            data-test="Add Explore Items"
            to={`/explore`}
            onClick={() => {
              setAddTo(activity);
            }}
          >
            Items from Explore
          </MenuItem>
          <MenuItem
            as={ReactRouterLink}
            data-test="Add My Activities Items"
            to={`/activities/${user!.userId}`}
            onClick={() => {
              setAddTo(activity);
            }}
          >
            Items from My Activities
          </MenuItem>
          <MenuItem
            data-test="Add Document Button"
            onClick={() => {
              if (user?.isAuthor) {
                createNewDocument();
              } else {
                setCreateDocumentParentId(activity.contentId);
                authorModePromptOnOpen();
              }
            }}
          >
            Blank Document {!user?.isAuthor && <>(with source code)</>}
          </MenuItem>
        </MenuList>
      </Menu>
    </Flex>
  );

  return (
    <>
      {moveContentModal}
      {copyContentModal}
      {deleteModal}
      {authorModeModal}
      {heading}
      <Flex
        data-test="Activities"
        padding="0 10px"
        margin="0px"
        width="100%"
        minHeight={`calc(100vh - ${headerHeight} - ${cardListHeaderHieght})`}
        background={numCards > 0 ? "white" : "var(--lightBlue)"}
        direction="column"
      >
        {cardList}
      </Flex>
    </>
  );
}
