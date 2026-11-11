import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { submitOperation } from "../../api/submitOperation";
import {
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Text,
  Textarea,
} from "@chakra-ui/react";

/** Keep in sync with `MAX_DESCRIPTION_LENGTH` in the API's `contentDetailsContract.ts`. */
export const MAX_DESCRIPTION_LENGTH = 5000;

/**
 * A textarea for the author to write a public description of their activity.
 * Saves when the textarea loses focus, if the text has changed.
 */
export function EditDescription({
  contentId,
  description,
}: {
  contentId: string;
  description: string | null;
}) {
  const fetcher = useFetcher();

  const savedValue = description ?? "";
  const [value, setValue] = useState(savedValue);
  const [lastSubmitted, setLastSubmitted] = useState(savedValue);

  // If the loader provides a new description (e.g., after revalidation),
  // reset to it.
  useEffect(() => {
    setValue(savedValue);
    setLastSubmitted(savedValue);
  }, [savedValue]);

  function save() {
    const trimmed = value.trim();
    if (trimmed === lastSubmitted.trim()) {
      return;
    }
    setLastSubmitted(trimmed);
    submitOperation(fetcher, "updateDescription", {
      contentId,
      description: trimmed,
    });
  }

  const isSaving = fetcher.state !== "idle";
  const hasUnsavedChanges = value.trim() !== lastSubmitted.trim();

  let status = "";
  if (isSaving) {
    status = "Saving...";
  } else if (hasUnsavedChanges) {
    status = "Unsaved changes";
  } else if (fetcher.data !== undefined) {
    status = "Saved";
  }

  return (
    <FormControl maxWidth="40rem">
      <FormLabel srOnly>Description</FormLabel>
      <Textarea
        data-test="Description Textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        maxLength={MAX_DESCRIPTION_LENGTH}
        rows={5}
        placeholder="Describe what this activity covers and how it might be used."
      />
      <HStack justifyContent="space-between">
        <FormHelperText>
          Visible to anyone who can view this activity. Saves when you click
          away.
        </FormHelperText>
        <HStack mt="0.5rem" spacing="1rem">
          <Text
            fontSize="sm"
            color="gray.600"
            _dark={{ color: "gray.400" }}
            aria-live="polite"
            data-test="Description Save Status"
          >
            {status}
          </Text>
          <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
            {value.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
        </HStack>
      </HStack>
    </FormControl>
  );
}
