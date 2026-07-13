import { ReactNode, RefObject, useEffect, useRef, useState } from "react";
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
  FormErrorMessage,
  Input,
  Select,
  SimpleGrid,
  Collapse,
  Icon,
  HStack,
  VStack,
  Code,
  Box,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { IconType } from "react-icons";
import {
  FaCreativeCommons,
  FaCreativeCommonsBy,
  FaCreativeCommonsSa,
  FaCreativeCommonsZero,
} from "react-icons/fa";
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

// The handful of licenses most image uploads use, surfaced as one-click cards
// with plain-language labels and Creative Commons badges. Everything else stays
// reachable behind "Other license…". `icons` compose the recognizable CC glyphs.
const COMMON_LICENSES: {
  code: MediaLicenseCode;
  label: string;
  icons: IconType[];
}[] = [
  {
    code: "CC-BY",
    label: "Credit the author",
    icons: [FaCreativeCommons, FaCreativeCommonsBy],
  },
  {
    code: "CC-BY-SA",
    label: "Credit + ShareAlike",
    icons: [FaCreativeCommons, FaCreativeCommonsBy, FaCreativeCommonsSa],
  },
  { code: "CC0", label: "Public domain", icons: [FaCreativeCommonsZero] },
];
const COMMON_CODES = COMMON_LICENSES.map((l) => l.code as string);

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

// A selectable license card (common license or the "Other…" escape hatch).
function LicenseCard({
  selected,
  onClick,
  icon,
  label,
  code,
  dataTest,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  code?: string;
  dataTest: string;
}) {
  return (
    <Button
      onClick={onClick}
      data-test={dataTest}
      aria-pressed={selected}
      variant="outline"
      height="auto"
      py="10px"
      px="8px"
      whiteSpace="normal"
      borderWidth="2px"
      borderColor={selected ? "blue.500" : "gray.200"}
      background={selected ? "blue.50" : undefined}
      _hover={{ borderColor: selected ? "blue.500" : "gray.300" }}
    >
      {/* Rendered as spans: block elements are invalid inside a <button>. */}
      <VStack as="span" spacing="4px">
        <Box
          as="span"
          display="flex"
          minHeight="20px"
          color={selected ? "blue.600" : "gray.500"}
        >
          {icon}
        </Box>
        <Text as="span" fontSize="sm" fontWeight="semibold">
          {label}
        </Text>
        {code ? (
          <Code fontSize="xs" background="transparent">
            {code}
          </Code>
        ) : null}
      </VStack>
    </Button>
  );
}

// A subtle "reveal more" section toggle used for the optional/advanced blocks.
function DisclosureToggle({
  isOpen,
  onToggle,
  children,
  dataTest,
}: {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  dataTest: string;
}) {
  return (
    <Button
      variant="link"
      size="sm"
      alignSelf="flex-start"
      color="gray.600"
      fontWeight="medium"
      data-test={dataTest}
      leftIcon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
      onClick={onToggle}
    >
      {children}
    </Button>
  );
}

/**
 * Modal for supplying an image's DoenetML `<image>` attribution: license, and
 * optionally author, title, and source. Uploaded images use this attribution
 * model instead of the activity-level license. Used both when uploading a new
 * image (`create`) and when editing an existing one (`edit`).
 *
 * Kept deliberately light: the required license is a one-click card choice, an
 * author name appears when the chosen license requires crediting, and the
 * power-user bits (dual licensing, Creative Commons version) and the rest of the
 * credit fields are tucked behind disclosures. A license is always required —
 * Save stays disabled until one is chosen (and, for attribution licenses, an
 * author is given) — so an image can never be saved unlicensed. Persistence is
 * delegated to `onSubmit`, which the modal awaits; it closes on success and
 * surfaces errors otherwise.
 */
export function EditImageAttribution({
  isOpen,
  onClose,
  initial,
  imageSource,
  headerLabel,
  submitLabel,
  onSubmit,
  defaultAuthorName,
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
  // The current user's display name, offered as a one-click author fill.
  defaultAuthorName?: string;
  finalFocusRef?: RefObject<HTMLElement | null>;
}) {
  const [authorName, setAuthorName] = useState("");
  const [authorUrl, setAuthorUrl] = useState("");
  const [title, setTitle] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [license1, setLicense1] = useState("");
  const [license2, setLicense2] = useState("");
  const [version, setVersion] = useState<string>(defaultCreativeCommonsVersion);
  const [showOther, setShowOther] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const {
    isOpen: advancedOpen,
    onOpen: advancedOnOpen,
    onClose: advancedOnClose,
    onToggle: advancedToggle,
  } = useDisclosure();
  const { isOpen: previewOpen, onToggle: previewToggle } = useDisclosure();

  // Reseed the form from `initial` only on the closed→open transition. `initial`
  // gets a fresh object identity on every parent render, so guarding on the
  // transition keeps an unrelated parent re-render from wiping in-progress edits.
  // The advanced (dual-license) section starts expanded when it already holds
  // data so edits are visible; otherwise it stays collapsed to keep it light.
  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (!justOpened) return;
    const [code1, code2] = splitLicenseCodes(initial.imageLicenseCodes);
    setAuthorName(initial.imageAuthorName);
    setAuthorUrl(initial.imageAuthorUrl);
    setTitle(initial.imageTitle);
    setOriginalUrl(initial.imageOriginalUrl);
    setLicense1(code1);
    setLicense2(code2);
    setVersion(initial.imageLicenseVersion || defaultCreativeCommonsVersion);
    setShowOther(code1 !== "" && !COMMON_CODES.includes(code1));
    setSubmitting(false);
    setErrMsg("");

    if (code2) advancedOnOpen();
    else advancedOnClose();
  }, [isOpen, initial, advancedOnOpen, advancedOnClose]);

  const licenseCodes = [license1, license2].filter(Boolean).join(" ");
  const versionApplies =
    isCreativeCommons(license1) || isCreativeCommons(license2);
  const effectiveVersion = versionApplies ? version : "";

  const hasLicense = licenseCodes.length > 0;
  const licenseIsOther = license1 !== "" && !COMMON_CODES.includes(license1);
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

  function chooseCommonLicense(code: string) {
    setLicense1(code);
    setShowOther(false);
  }

  function chooseOtherLicense(code: string) {
    setLicense1(code);
    // Snap back to a card if they picked a common one from the dropdown.
    if (COMMON_CODES.includes(code)) setShowOther(false);
  }

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
          <VStack spacing="16px" align="stretch">
            {/* License — the one required choice, as one-click cards. */}
            <FormControl isRequired isInvalid={!hasLicense}>
              <FormLabel>License</FormLabel>
              <SimpleGrid columns={{ base: 2, sm: 4 }} spacing="8px">
                {COMMON_LICENSES.map((l) => (
                  <LicenseCard
                    key={l.code}
                    dataTest={`License Card ${l.code}`}
                    selected={license1 === l.code}
                    onClick={() => chooseCommonLicense(l.code)}
                    icon={
                      <HStack as="span" spacing="2px" fontSize="lg">
                        {l.icons.map((I, i) => (
                          <Icon as={I} key={i} />
                        ))}
                      </HStack>
                    }
                    label={l.label}
                    code={l.code}
                  />
                ))}
                <LicenseCard
                  dataTest="License Card Other"
                  selected={showOther || licenseIsOther}
                  onClick={() => setShowOther(true)}
                  icon={
                    <Text as="span" fontSize="lg">
                      …
                    </Text>
                  }
                  label={licenseIsOther ? "Other" : "More…"}
                  code={licenseIsOther ? license1 : undefined}
                />
              </SimpleGrid>
              {showOther || licenseIsOther ? (
                <Select
                  marginTop="8px"
                  data-test="Image License Select"
                  placeholder="Choose another license"
                  value={licenseIsOther ? license1 : ""}
                  onChange={(e) => chooseOtherLicense(e.target.value)}
                >
                  {mediaLicenses.map((l) => (
                    <option value={l.code} key={l.code}>
                      {l.code} — {l.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              {hasLicense ? null : (
                <FormErrorMessage>
                  Every image needs a license.
                </FormErrorMessage>
              )}
            </FormControl>

            {/* Author — appears/required per the chosen license. */}
            <FormControl isRequired={authorRequired} isInvalid={authorMissing}>
              <FormLabel>Author</FormLabel>
              <Input
                data-test="Image Author Name Input"
                value={authorName}
                maxLength={255}
                placeholder="Who created this image?"
                onChange={(e) => setAuthorName(e.target.value)}
              />
              {defaultAuthorName && authorName.trim() === "" ? (
                <Button
                  variant="link"
                  size="xs"
                  marginTop="4px"
                  data-test="Use My Name"
                  onClick={() => setAuthorName(defaultAuthorName)}
                >
                  Use my name ({defaultAuthorName})
                </Button>
              ) : (
                <FormHelperText>
                  {authorRequired
                    ? "This license requires crediting the author."
                    : "Optional for public-domain images."}
                </FormHelperText>
              )}
            </FormControl>

            {/* The rest of the TASL credit — optional, always shown. */}
            <FormControl>
              <FormLabel>Author URL</FormLabel>
              <Input
                data-test="Image Author Url Input"
                value={authorUrl}
                type="url"
                placeholder="https://…"
                onChange={(e) => setAuthorUrl(e.target.value)}
              />
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
            </FormControl>

            {/* Advanced licensing: dual licensing + Creative Commons version. */}
            <Box>
              <DisclosureToggle
                isOpen={advancedOpen}
                onToggle={advancedToggle}
                dataTest="Toggle Advanced Licensing"
              >
                Advanced licensing
              </DisclosureToggle>
              <Collapse in={advancedOpen} animateOpacity>
                <VStack spacing="12px" align="stretch" paddingTop="8px">
                  <FormControl isDisabled={!license1}>
                    <FormLabel>Second license (dual licensing)</FormLabel>
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
                  </FormControl>
                </VStack>
              </Collapse>
            </Box>

            {/* Live preview of the generated tag (editing an existing image). */}
            {previewTag ? (
              <Box>
                <DisclosureToggle
                  isOpen={previewOpen}
                  onToggle={previewToggle}
                  dataTest="Toggle Tag Preview"
                >
                  Show tag preview
                </DisclosureToggle>
                <Collapse in={previewOpen} animateOpacity>
                  <Code
                    data-test="Image Tag Preview"
                    display="block"
                    whiteSpace="pre-wrap"
                    marginTop="8px"
                    p="8px"
                    fontSize="xs"
                  >
                    {previewTag}
                  </Code>
                </Collapse>
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
