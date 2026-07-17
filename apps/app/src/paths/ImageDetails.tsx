import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Link as ChakraLink,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Tr,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  MdContentCopy,
  MdOutlineEdit,
  MdOutlineImageNotSupported,
} from "react-icons/md";
import {
  useLoaderData,
  useNavigate,
  useOutletContext,
  useRevalidator,
} from "react-router";
import axios from "axios";
import { mediaLicenses } from "@doenet-tools/shared";
import { ImageItem } from "../types";
import { resolveImageSource } from "../utils/media";
import { buildImageTag } from "../utils/imageTag";
import { WithSideBanners } from "../layout/WithSideBanners";
import {
  EditImageAttribution,
  imageToFormValues,
  type ImageAttributionFormValues,
} from "../popups/EditImageAttribution";
import { SiteContext } from "./SiteHeader";
import { createNameNoTag } from "../utils/names";

export async function loader({ params }: { params: any }) {
  const {
    data: { image },
  } = await axios.get(`/api/media/image/${params.contentId}/details`);

  return { image: image as ImageItem };
}

// Map a space-separated `imageLicenseCodes` string onto the human-readable
// license names DoenetML uses. Unknown codes fall back to the raw code so
// nothing is silently dropped.
function licenseNames(codes: string | null | undefined): string {
  if (!codes) {
    return "";
  }
  return codes
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((code) => {
      const info = mediaLicenses.find((l) => l.code === code.toUpperCase());
      return info ? info.name : code;
    })
    .join(" + ");
}

// A single attribution row, rendered only when the value is present. URL
// values become links so the credit sources stay reachable.
function AttributionRow({
  label,
  value,
  isUrl = false,
}: {
  label: string;
  value: string | null | undefined;
  isUrl?: boolean;
}) {
  if (!value) {
    return null;
  }
  return (
    <Tr>
      <Th
        width="12rem"
        verticalAlign="top"
        textTransform="none"
        color="gray.600"
      >
        {label}
      </Th>
      <Td>
        {isUrl ? (
          <ChakraLink href={value} isExternal color="blue.600">
            {value}
          </ChakraLink>
        ) : (
          value
        )}
      </Td>
    </Tr>
  );
}

/**
 * The details page for an uploaded image content item. Uploaded images aren't
 * editable documents, so clicking one from the activities list opens this page
 * to show the image together with its DoenetML `<image>` attribution/licensing,
 * a one-click copy of the tag to paste into a document, and (for the owner) an
 * attribution editor.
 */
export function ImageDetails() {
  const { image } = useLoaderData() as { image: ImageItem };
  const { user } = useOutletContext<SiteContext>();
  const toast = useToast();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [editing, setEditing] = useState(false);
  // Return focus to the Edit button when the modal closes.
  const editFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.title = `${image.name} - Doenet`;
  }, [image.name]);

  const src = resolveImageSource(image.imageSource);
  const license = licenseNames(image.imageLicenseCodes);
  // Only the owner may edit an image's attribution (enforced server-side too).
  const canEdit = user?.userId === image.ownerId;

  // Persists edited attribution, then reloads the page's loader data so the
  // shown values (and copied tag) reflect the change.
  async function saveAttribution(values: ImageAttributionFormValues) {
    await axios.patch("/api/media/image/attribution", {
      contentId: image.contentId,
      ...values,
    });
    revalidator.revalidate();
  }

  const hasAttribution =
    image.imageTitle ||
    image.imageAuthorName ||
    image.imageAuthorUrl ||
    image.imageOriginalUrl ||
    license;

  async function copyTag() {
    const tag = buildImageTag(image);
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
  }

  return (
    <WithSideBanners bgColor="white" padding="24px">
      <VStack align="stretch" spacing="20px">
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "flex-start", sm: "center" }}
          justify="space-between"
          gap="12px"
        >
          <Heading size="lg" wordBreak="break-word">
            {image.name}
          </Heading>
          <HStack spacing="8px" flexShrink={0}>
            <Button
              leftIcon={<MdContentCopy />}
              colorScheme="blue"
              variant="outline"
              data-test="Copy Image Tag"
              onClick={copyTag}
            >
              Copy tag
            </Button>
            {canEdit ? (
              <Button
                leftIcon={<MdOutlineEdit />}
                variant="outline"
                data-test="Edit Image Attribution"
                onClick={(e) => {
                  editFocusRef.current = e.currentTarget;
                  setEditing(true);
                }}
              >
                Attribution
              </Button>
            ) : null}
          </HStack>
        </Flex>

        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          bg="gray.50"
          p="16px"
          display="flex"
          justifyContent="center"
        >
          {src ? (
            <Image
              src={src}
              alt={image.imageTitle || image.name}
              maxW="100%"
              maxH="70vh"
              objectFit="contain"
              data-test="Uploaded Image"
            />
          ) : (
            <VStack color="gray.500" py="40px" spacing="8px">
              <MdOutlineImageNotSupported size="2.5rem" />
              <Text>This image isn't available to display yet.</Text>
            </VStack>
          )}
        </Box>

        {hasAttribution ? (
          <Box>
            <Heading size="sm" mb="8px">
              Attribution
            </Heading>
            <Table size="sm" variant="simple">
              <Tbody>
                <AttributionRow label="Title" value={image.imageTitle} />
                <AttributionRow label="Author" value={image.imageAuthorName} />
                <AttributionRow
                  label="Author URL"
                  value={image.imageAuthorUrl}
                  isUrl
                />
                <AttributionRow
                  label="Original URL"
                  value={image.imageOriginalUrl}
                  isUrl
                />
                <AttributionRow label="License" value={license} />
                <AttributionRow
                  label="License version"
                  value={image.imageLicenseVersion}
                />
              </Tbody>
            </Table>
          </Box>
        ) : null}

        <HStack>
          <Button variant="link" color="blue.600" onClick={() => navigate(-1)}>
            Back
          </Button>
        </HStack>
      </VStack>

      {canEdit ? (
        <EditImageAttribution
          isOpen={editing}
          onClose={() => setEditing(false)}
          initial={imageToFormValues(image)}
          imageSource={image.imageSource}
          headerLabel="Image attribution & license"
          submitLabel="Save"
          defaultAuthorName={user ? createNameNoTag(user) : undefined}
          finalFocusRef={editFocusRef}
          onSubmit={saveAttribution}
        />
      ) : null}
    </WithSideBanners>
  );
}
