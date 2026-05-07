import { useState, useRef, ReactElement } from "react";
import {
  Editable,
  EditablePreview,
  EditableInput,
  Box,
  Show,
  Text,
} from "@chakra-ui/react";
import { type FetcherWithComponents } from "react-router";

/**
 * Component to display the title of content, optionally editable
 */
export function NameBar({
  contentId,
  contentName,
  isEditable = true,
  leftIcon,
  dataTest,
  overrideMaxWidth,
  fontSizeMode = "editor",
  fetcher,
}: {
  contentId: string | null;
  isEditable?: boolean;
  contentName: string;
  leftIcon: ReactElement;
  dataTest: string;
  overrideMaxWidth?: string;
  fontSizeMode?: "editor" | "folder";
  fetcher?: FetcherWithComponents<unknown>;
}) {
  const maxWidth = overrideMaxWidth ?? "20rem";
  const width = "100%";

  const [name, setName] = useState(contentName);

  const lastBaseDataName = useRef(contentName);

  //Update when something else updates the name
  if (contentName != lastBaseDataName.current) {
    if (name != contentName) {
      setName(contentName);
    }
  }
  lastBaseDataName.current = contentName;

  // Special case: root folder or special view of some kind
  // Ex: My Activities, Shared with me, Trash
  // We can't edit the name of that, so just show read-only text
  if (!isEditable || contentId === null || !fetcher) {
    // Read-only header for root folder: icon sits inside the title box (non-editable)
    return (
      <Box position="relative" maxWidth={maxWidth} width={width}>
        <Show above="md">
          <Box
            position="absolute"
            top="50%"
            transform="translateY(-50%)"
            pointerEvents="none"
            display="flex"
            alignItems="center"
            padding="0 0.1rem"
          >
            {leftIcon}
          </Box>
        </Show>
        <Text
          data-test={dataTest}
          fontWeight="bold"
          fontSize={fontSizeMode === "folder" ? "xl" : undefined}
          noOfLines={1}
          lineHeight="1.2"
          pl={{ base: "0rem", md: "2.5rem" }}
          isTruncated
        >
          {name}
        </Text>
      </Box>
    );
  }

  function submitName(newName: string) {
    let submitValue = newName;
    if (submitValue.trim() === "") {
      submitValue = "Untitled";
    }

    fetcher?.submit(
      {
        path: "updateContent/updateContentSettings",
        contentId,
        name: submitValue,
      },
      { method: "post", encType: "application/json" },
    );
  }

  return (
    <Box position="relative" maxWidth={maxWidth} width={width}>
      <Show above="md">
        <Box
          position="absolute"
          top="50%"
          transform="translateY(-50%)"
          pointerEvents="none"
          display="flex"
          alignItems="center"
          padding="0 0.1rem"
        >
          {leftIcon}
        </Box>
      </Show>

      <Editable
        data-test={dataTest}
        value={name}
        width={width}
        maxWidth={maxWidth}
        fontWeight="bold"
        fontSize={fontSizeMode === "folder" ? "xl" : undefined}
        textAlign="left"
        onChange={(value) => {
          setName(value);
        }}
        onSubmit={(value) => {
          submitName(value);
        }}
      >
        <Box
          as={EditablePreview}
          className="editable-name"
          data-test="Editable Title"
          noOfLines={1}
          lineHeight="1.2"
          pl={{ base: "0rem", md: "1.8rem" }}
          rounded="none"
          outline="1px solid gray"
        />
        <Box
          as={EditableInput}
          data-test="Editable Input"
          aria-label="Title Input"
          maxLength={191}
          lineHeight="1.2"
          pl={{ base: "0rem", md: "1.8rem" }}
          rounded="none"
          outline="1px solid gray"
        />
      </Editable>
    </Box>
  );
}
