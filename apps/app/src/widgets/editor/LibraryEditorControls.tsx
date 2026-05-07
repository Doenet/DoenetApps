import { useEffect } from "react";
import { Heading, Button, VStack, Text, Flex, Spacer } from "@chakra-ui/react";
import { DateTime } from "luxon";
import type { FetcherWithComponents } from "react-router";
import { ContentType, LibraryComment, LibraryRelations } from "../../types";
import { createNameCheckIsMeTag, createNameNoTag } from "../../utils/names";
export type LibraryEditorData = {
  libraryRelations: LibraryRelations;
  libraryComments: LibraryComment[];
};
import { getLibraryStatusStylized } from "../../utils/library";
import { ChatConversation } from "../ChatConversation";
import { editorUrl } from "../../utils/url";

/**
 * This widget allows library curators to process library suggestions. Available actions: claim, publish, unpublish, reject, comment.
 * The library curator must claim the activity before they can do any other action.
 *
 * Not meant to be used by authors, see `EditorLibraryMode` for author controls.
 */
export function LibraryEditorControls({
  contentId,
  contentType,
  loadFetcher,
  submitFetcher,
}: {
  contentId: string;
  contentType: ContentType;
  loadFetcher: FetcherWithComponents<LibraryEditorData>;
  submitFetcher: FetcherWithComponents<unknown>;
}) {
  useEffect(() => {
    if (loadFetcher.state === "idle" && !loadFetcher.data) {
      loadFetcher.load(editorUrl(contentId, contentType, "library"));
    }
  }, [contentId, contentType, loadFetcher]);

  let contents;
  if (!loadFetcher.data) {
    contents = <p>Loading...</p>;
  } else {
    const { libraryRelations, libraryComments } =
      loadFetcher.data as LibraryEditorData;
    const librarySource = libraryRelations.source!;
    const status = librarySource.status;
    const sourceIdIsVisible = librarySource.sourceContentId !== null;

    let byLine = "";
    if (librarySource.primaryEditor) {
      byLine = ` by ${createNameCheckIsMeTag(librarySource.primaryEditor, true)}`;
    }

    contents = (
      <VStack align="flex-start">
        <Heading size="md">
          Status: {getLibraryStatusStylized(status)}
          {byLine}
        </Heading>

        {!librarySource.iAmPrimaryEditor && (
          <Button
            onClick={() => {
              submitFetcher.submit(
                {
                  path: "curate/claimOwnershipOfReview",
                  contentId,
                },
                { method: "post", encType: "application/json" },
              );
            }}
          >
            Claim
          </Button>
        )}
        {status === "UNDER_REVIEW" && (
          <Button
            onClick={() => {
              submitFetcher.submit(
                {
                  path: "curate/publishActivityToLibrary",
                  contentId,
                },
                { method: "post", encType: "application/json" },
              );
            }}
          >
            Publish
          </Button>
        )}

        {status === "UNDER_REVIEW" && (
          <Button
            onClick={() => {
              submitFetcher.submit(
                {
                  path: "curate/rejectActivity",
                  contentId,
                },
                { method: "post", encType: "application/json" },
              );
            }}
          >
            Reject
          </Button>
        )}

        {status === "PUBLISHED" && (
          <Button
            onClick={() => {
              submitFetcher.submit(
                {
                  path: "curate/unpublishActivityFromLibrary",
                  contentId,
                },
                { method: "post", encType: "application/json" },
              );
            }}
          >
            Unpublish
          </Button>
        )}
        <Text>
          Requested on{" "}
          {DateTime.fromISO(librarySource.reviewRequestDate!).toLocaleString(
            DateTime.DATE_MED,
          )}
          {librarySource.ownerRequested ? ` by owner` : ""}
        </Text>
        {!sourceIdIsVisible ? (
          <Text>Note: Source activity is no longer public</Text>
        ) : null}

        {librarySource.ownerRequested && (
          <ChatConversation
            conversationTitle="Conversation with owner"
            canComment={librarySource.iAmPrimaryEditor ?? false}
            messages={libraryComments.map((c) => {
              return {
                user: createNameNoTag(c.user),
                userIsMe: c.isMe,
                message: c.comment,
                dateTime: DateTime.fromISO(c.dateTime),
              };
            })}
            onAddComment={(comment) => {
              submitFetcher.submit(
                {
                  path: "curate/addComment",
                  contentId,
                  asEditor: true,
                  comment,
                },
                { method: "post", encType: "application/json" },
              );
            }}
          />
        )}
      </VStack>
    );
  }

  return (
    <Flex
      // width="50%"
      height="100%"
      borderWidth="5px"
      borderColor="orange"
      backgroundColor="white"
      padding="1rem 0rem 0rem 1rem"
      direction="column"
    >
      {contents}
      <Spacer />
      <Text fontStyle="italic">Panel only visible to library editors</Text>
    </Flex>
  );
}
