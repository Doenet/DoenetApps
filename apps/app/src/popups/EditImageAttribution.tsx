import { RefObject, useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  VStack,
  Code,
  Box,
  Text,
} from "@chakra-ui/react";
import {
  creativeCommonsVersions,
  defaultCreativeCommonsVersion,
  licenseRequiresAttribution,
  mediaLicenses,
  type MediaLicenseCode,
} from "@doenet-tools/shared";
import { buildImageTag } from "../utils/imageTag";

// The editable attribution fields, as plain form strings ("" when empty). The
// license is required; the other fields are optional (author is required only
// when the chosen license requires attribution — enforced below and server-side).
export type ImageAttributionFormValues = {
  imageAuthorName: string;
  imageAuthorUrl: string;
  imageTitle: string;
  imageOriginalUrl: string;
  imageLicenseCodes: string;
  imageLicenseVersion: string;
};

export const emptyImageAttribution: ImageAttributionFormValues = {
  imageAuthorName: "",
  imageAuthorUrl: "",
  imageTitle: "",
  imageOriginalUrl: "",
  imageLicenseCodes: "",
  imageLicenseVersion: defaultCreativeCommonsVersion,
};

// Split the stored space-separated `imageLicenseCodes` into a primary and an
// optional secondary code for the two dropdowns.
function splitLicenseCodes(codes: string): [string, string] {
  const parts = codes.trim().split(/\s+/).filter(Boolean);
  return [parts[0] ?? "", parts[1] ?? ""];
}

function isCreativeCommons(code: string): boolean {
  return mediaLicenses.some(
    (l) =>
      l.code === (code as MediaLicenseCode) && l.kind === "creative-commons",
  );
}

/**
 * Modal for supplying an image's DoenetML `<image>` attribution: author, title,
 * source, and license. Uploaded images use this attribution model instead of
 * the activity-level license. Used both when uploading a new image (`create`)
 * and when editing an existing one (`edit`).
 *
 * A license is required — the Save button stays disabled until one is chosen,
 * and (for attribution licenses) an author name is given — so an image can
 * never be created or saved unlicensed. Persistence is delegated to `onSubmit`,
 * which the modal awaits; it closes on success and surfaces errors otherwise.
 */
export function EditImageAttribution({
  isOpen,
  onClose,
  initial,
  imageSource,
  headerLabel,
  submitLabel,
  onSubmit,
  finalFocusRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  initial: ImageAttributionFormValues;
  // Source ref for the live tag preview; absent when uploading (no ref yet).
  imageSource?: string | null;
  headerLabel: string;
  submitLabel: string;
  onSubmit: (values: ImageAttributionFormValues) => Promise<void>;
  finalFocusRef?: RefObject<HTMLElement | null>;
}) {
  const [authorName, setAuthorName] = useState("");
  const [authorUrl, setAuthorUrl] = useState("");
  const [title, setTitle] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [license1, setLicense1] = useState("");
  const [license2, setLicense2] = useState("");
  const [version, setVersion] = useState<string>(defaultCreativeCommonsVersion);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Reseed the form from `initial` whenever the modal (re)opens.
  useEffect(() => {
    if (isOpen) {
      const [code1, code2] = splitLicenseCodes(initial.imageLicenseCodes);
      setAuthorName(initial.imageAuthorName);
      setAuthorUrl(initial.imageAuthorUrl);
      setTitle(initial.imageTitle);
      setOriginalUrl(initial.imageOriginalUrl);
      setLicense1(code1);
      setLicense2(code2);
      setVersion(initial.imageLicenseVersion || defaultCreativeCommonsVersion);
      setSubmitting(false);
      setErrMsg("");
    }
  }, [isOpen, initial]);

  const licenseCodes = [license1, license2].filter(Boolean).join(" ");
  const versionApplies =
    isCreativeCommons(license1) || isCreativeCommons(license2);
  const effectiveVersion = versionApplies ? version : "";

  const hasLicense = licenseCodes.length > 0;
  const authorRequired = hasLicense && licenseRequiresAttribution(licenseCodes);
  const authorMissing = authorRequired && authorName.trim().length === 0;
  const canSave = hasLicense && !authorMissing && !submitting;

  const values: ImageAttributionFormValues = {
    imageAuthorName: authorName,
    imageAuthorUrl: authorUrl,
    imageTitle: title,
    imageOriginalUrl: originalUrl,
    imageLicenseCodes: licenseCodes,
    imageLicenseVersion: effectiveVersion,
  };

  const previewTag =
    imageSource != null ? buildImageTag({ ...values, imageSource }) : null;

  async function save() {
    if (!canSave) return;
    setSubmitting(true);
    setErrMsg("");
    try {
      await onSubmit(values);
      onClose();
    } catch (e: any) {
      setErrMsg(
        e?.response?.data?.details ||
          e?.response?.data?.error ||
          e?.message ||
          "Could not save",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size="lg"
      closeOnOverlayClick={!submitting}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{headerLabel}</ModalHeader>
        <ModalCloseButton isDisabled={submitting} />
        <ModalBody>
          <VStack spacing="12px" align="stretch">
            <FormControl isRequired isInvalid={!hasLicense}>
              <FormLabel>License</FormLabel>
              <Select
                data-test="Image License Select"
                placeholder="Select a license"
                value={license1}
                onChange={(e) => setLicense1(e.target.value)}
              >
                {mediaLicenses.map((l) => (
                  <option value={l.code} key={l.code}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </Select>
              <FormHelperText>Every image must have a license.</FormHelperText>
            </FormControl>

            <FormControl isDisabled={!license1}>
              <FormLabel>Second license (for dual licensing)</FormLabel>
              <Select
                data-test="Image License Select 2"
                placeholder="None"
                value={license2}
                onChange={(e) => setLicense2(e.target.value)}
              >
                {mediaLicenses
                  .filter((l) => l.code !== license1)
                  .map((l) => (
                    <option value={l.code} key={l.code}>
                      {l.code} — {l.name}
                    </option>
                  ))}
              </Select>
            </FormControl>

            <FormControl isDisabled={!versionApplies}>
              <FormLabel>Creative Commons version</FormLabel>
              <Select
                data-test="Image License Version Select"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              >
                {creativeCommonsVersions.map((v) => (
                  <option value={v} key={v}>
                    {v}
                  </option>
                ))}
              </Select>
              <FormHelperText>
                Applies only to Creative Commons licenses.
              </FormHelperText>
            </FormControl>

            <FormControl isRequired={authorRequired} isInvalid={authorMissing}>
              <FormLabel>Author name</FormLabel>
              <Input
                data-test="Image Author Name Input"
                value={authorName}
                maxLength={255}
                onChange={(e) => setAuthorName(e.target.value)}
              />
              <FormHelperText>
                {authorRequired
                  ? "Required — this license requires crediting the author."
                  : "Public-domain images need no author."}
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Author URL</FormLabel>
              <Input
                data-test="Image Author Url Input"
                value={authorUrl}
                type="url"
                placeholder="https://…"
                onChange={(e) => setAuthorUrl(e.target.value)}
              />
              <FormHelperText>
                Links the author&rsquo;s name in the credit.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Image title</FormLabel>
              <Input
                data-test="Image Title Input"
                value={title}
                maxLength={255}
                placeholder="e.g. Doric temple corner"
                onChange={(e) => setTitle(e.target.value)}
              />
              <FormHelperText>
                Shown in place of the generic word &ldquo;Image&rdquo; in the
                credit.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Original source URL</FormLabel>
              <Input
                data-test="Image Original Url Input"
                value={originalUrl}
                type="url"
                placeholder="https://…"
                onChange={(e) => setOriginalUrl(e.target.value)}
              />
              <FormHelperText>
                Where the image was originally found; links the title.
              </FormHelperText>
            </FormControl>

            {previewTag ? (
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb="4px">
                  Tag preview
                </Text>
                <Code
                  data-test="Image Tag Preview"
                  display="block"
                  whiteSpace="pre-wrap"
                  p="8px"
                  fontSize="xs"
                >
                  {previewTag}
                </Code>
              </Box>
            ) : null}

            {errMsg ? (
              <Text color="red.600" data-test="Image Attribution Error">
                {errMsg}
              </Text>
            ) : null}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            data-test="Save Image Attribution"
            colorScheme="blue"
            marginRight="8px"
            isLoading={submitting}
            isDisabled={!canSave}
            onClick={save}
          >
            {submitLabel}
          </Button>
          <Button
            data-test="Cancel Image Attribution"
            onClick={onClose}
            isDisabled={submitting}
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
