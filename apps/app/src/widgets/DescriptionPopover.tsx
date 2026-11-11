import { useState } from "react";
import {
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";
import { api } from "../api/client";

type DescriptionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; description: string | null }
  | { status: "error" };

/**
 * A small "i" button that opens a popover with the content's description.
 * The description is fetched the first time the popover opens.
 */
export function DescriptionPopover({
  contentId,
  title,
}: {
  contentId: string;
  title: string;
}) {
  const [state, setState] = useState<DescriptionState>({ status: "idle" });

  function loadDescription() {
    if (state.status === "loading" || state.status === "loaded") {
      return;
    }
    setState({ status: "loading" });
    api("getContentDetails", { contentId })
      .then(({ description }) => setState({ status: "loaded", description }))
      .catch(() => setState({ status: "error" }));
  }

  let body;
  switch (state.status) {
    case "idle":
    case "loading":
      body = <Spinner size="sm" aria-label="Loading description" />;
      break;
    case "error":
      body = <Text>Could not load the description.</Text>;
      break;
    case "loaded":
      body = state.description ? (
        <Text whiteSpace="pre-wrap">{state.description}</Text>
      ) : (
        <Text fontStyle="italic" color="textMuted">
          No description provided.
        </Text>
      );
      break;
  }

  return (
    <Popover isLazy placement="bottom-end" onOpen={loadDescription}>
      <PopoverTrigger>
        <IconButton
          data-test="Description Info Button"
          variant="ghost"
          size="sm"
          icon={<InfoOutlineIcon />}
          color="textMuted"
          aria-label={`Description of ${title}`}
        />
      </PopoverTrigger>
      <PopoverContent data-test="Description Popover">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight="bold" paddingRight="2rem">
          {title}
        </PopoverHeader>
        <PopoverBody maxHeight="20rem" overflowY="auto">
          {body}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
