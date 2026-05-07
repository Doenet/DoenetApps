import {
  FetcherWithComponents,
  useFetcher,
  useLoaderData,
  useNavigate,
  useOutletContext,
} from "react-router";
import axios from "axios";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Text,
  VStack,
} from "@chakra-ui/react";
import { EditorContext } from "./EditorHeader";
import {
  getLibraryStatusDescription,
  getLibraryStatusStylized,
} from "../../utils/library";
import { DateTime } from "luxon";
import { createNameNoTag } from "../../utils/names";
import { ChatConversation } from "../../widgets/ChatConversation";
import { ContentType, LibraryComment, LibraryRelations } from "../../types";
import { contentTypeToName } from "../../utils/activity";

export async function loader({ params }: { params: any }) {
  const { data: libraryRelations } = await axios.get(
    `/api/curate/getLibraryRelations/${params.contentId}`,
  );

  const { data: libraryComments } = await axios.get(
    `/api/curate/getComments/${params.contentId}`,
  );

  return {
    libraryRelations,
    libraryComments,
  };
}

export interface EditorLibraryModeComponentProps {
  libraryRelations: LibraryRelations;
  libraryComments: LibraryComment[];
  contentId: string;
  isPublic: boolean;
  contentType: ContentType;
  contentName: string;
  fetcher: FetcherWithComponents<any>;
  onClose: () => void;
}

/**
 * Presentational component for library status and curation.
 * This component is separated from React Router for testing purposes.
 */
export function EditorLibraryModeComponent({
  libraryRelations,
  libraryComments,
  contentId,
  isPublic,
  contentType,
  contentName,
  fetcher,
  onClose,
}: EditorLibraryModeComponentProps) {
  const suggestCuration = () => {
    fetcher.submit(
      {
        path: "curate/suggestToBeCurated",
        contentId,
      },
      { method: "post", encType: "application/json" },
    );
  };

  let contents;
  if (!libraryRelations.activity) {
    contents = (
      <>
        <Text>
          The <Text as="b">Doenet Library</Text> is a curated selection of
          public DoenetML activities across various subjects. Activities in the
          library are <Text as="em">peer-reviewed</Text> and{" "}
          <Text as="em">appear prominently in search results</Text>. Suggesting
          your activity allows you to share your work with a wider audience and
          contribute to the e-learning ecosystem. Please make sure to add
          classifications to your activity before you suggest it.
        </Text>
        {!isPublic && (
          <Alert status="info">
            <AlertIcon />
            This {contentTypeToName[contentType].toLowerCase()} must be shared
            publicly to be considered for the library.
          </Alert>
        )}
        <Center paddingTop="1em">
          <Button
            data-test="Suggest this activity"
            colorScheme="blue"
            isDisabled={!isPublic}
            onClick={suggestCuration}
          >
            Suggest this activity
          </Button>
        </Center>
      </>
    );
  } else {
    contents = (
      <>
        <VStack align={"left"} spacing={4}>
          <Heading size="md">
            Status is{" "}
            {getLibraryStatusStylized(libraryRelations.activity.status)}
          </Heading>

          {getLibraryStatusDescription(libraryRelations.activity.status)}

          <ChatConversation
            conversationTitle="Conversation with editor(s)"
            canComment={true}
            messages={libraryComments.map((c) => {
              return {
                user: createNameNoTag(c.user),
                userIsMe: c.isMe,
                message: c.comment,
                dateTime: DateTime.fromISO(c.dateTime),
              };
            })}
            onAddComment={(comment) => {
              fetcher.submit(
                {
                  path: "curate/addComment",
                  contentId,
                  asEditor: false,
                  comment,
                },
                { method: "post", encType: "application/json" },
              );
            }}
          />
        </VStack>

        {libraryRelations.activity.status === "REJECTED" ? (
          <Box mt={4}>
            <Button
              data-test="Resubmit Library Request"
              colorScheme="blue"
              onClick={suggestCuration}
            >
              Resubmit for review
            </Button>
          </Box>
        ) : null}
      </>
    );
  }

  return (
    <Modal size="full" motionPreset="none" isOpen={true} onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <Center>{contentName} - Library status</Center>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>{contents}</ModalBody>
      </ModalContent>
    </Modal>
  );
}

/**
 * Container component that handles React Router integration.
 * This page allows you to suggest your document for the library, track its status in the review process, and communicate with library editors.
 * Context: `documentEditor`
 */
export function EditorLibraryMode() {
  const { libraryRelations, libraryComments } = useLoaderData() as {
    libraryRelations: LibraryRelations;
    libraryComments: LibraryComment[];
  };

  const { contentId, isPublic, contentType, contentName } =
    useOutletContext<EditorContext>();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  return (
    <EditorLibraryModeComponent
      libraryRelations={libraryRelations}
      libraryComments={libraryComments}
      contentId={contentId}
      isPublic={isPublic}
      contentType={contentType}
      contentName={contentName}
      fetcher={fetcher}
      onClose={() => navigate(-1)}
    />
  );
}
