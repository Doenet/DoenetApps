import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
  useFetcher,
} from "react-router";
import {
  AssignmentMode,
  ContentClassification,
  DoenetmlVersion,
  LicenseCode,
} from "../../types";
import { Category, CategoryGroup } from "@doenet-tools/shared";
import axios from "axios";
import { Box, Heading, VStack } from "@chakra-ui/react";
import { BlueBanner } from "../../widgets/BlueBanner";
import { processRemixes } from "../../utils/processRemixes";
import { EditorContext } from "./EditorHeader";
import { EditAssignmentSettings } from "../../widgets/editor/EditAssignmentSettings";
import { EditCategories } from "../../widgets/editor/EditCategories";
import { EditClassifications } from "../../widgets/editor/EditClassifications";
import { EditLicense } from "../../widgets/editor/EditLicense";
import { AuthorLicenseBox } from "../../widgets/Licenses";
import {
  DoenetMLSelectionBox,
  UpgradeSyntax,
} from "./DoenetMLVersionComponents";

export async function loader({ params }: { params: any }) {
  const { data } = await axios.get(
    `/api/editor/getEditorSettings/${params.contentId}`,
  );

  const {
    data: { allCategories },
  } = await axios.get(`/api/info/getAllCategories/`);

  // TODO: Add this information to `getEditorSettingsModeData` query
  // and return only the info we need
  const {
    data: { remixSources },
  } = await axios.get(`/api/remix/getRemixSources/${params.contentId}`);
  const sources = processRemixes(remixSources);
  const remixSourceLicenseCode = sources[0]?.withLicenseCode || null;

  const baseData = {
    isPublic: data.isPublic,
    isShared: data.isShared,
    assigned: data.assigned,
    mode: data.mode,
    maxAttempts: data.maxAttempts,
    individualizeByStudent: data.individualizeByStudent,
    licenseCode: data.licenseCode,
    categories: data.categories,
    classifications: data.classifications,
    remixSourceLicenseCode,
    allCategories,
    contentId: params.contentId,
  };

  if (data.doenetmlVersionId) {
    return {
      ...baseData,
      doenetmlVersionId: data.doenetmlVersionId,
    };
  } else {
    return baseData;
  }
}

/**
 * This component displays the settings for an activity.
 * It is a presentational component that accepts all data as props.
 */
export function EditorSettingsModeComponent({
  isPublic,
  isShared,
  assigned,
  mode,
  maxAttempts,
  individualizeByStudent,
  licenseCode,
  categories,
  classifications,
  remixSourceLicenseCode,
  allCategories,
  doenetmlVersionId,
  contentId,
  allLicenses,
  allDoenetmlVersions,
  inLibrary,
  contentType,
  headerHeight,
  showRequired,
  maxAttemptsFetcher,
  variantFetcher,
  modeFetcher,
  deleteClassificationFetcher,
  addClassificationFetcher,
}: {
  isPublic: boolean;
  isShared: boolean;
  assigned: boolean;
  mode: AssignmentMode;
  maxAttempts: number;
  individualizeByStudent: boolean;
  licenseCode: LicenseCode | null;
  categories: Category[];
  classifications: ContentClassification[];
  remixSourceLicenseCode: LicenseCode | null;
  allCategories: CategoryGroup[];
  doenetmlVersionId?: number;
  contentId: string;
  allLicenses: any[];
  allDoenetmlVersions: DoenetmlVersion[];
  inLibrary: boolean;
  contentType: string;
  headerHeight: string;
  showRequired: boolean;
  maxAttemptsFetcher: any;
  variantFetcher: any;
  modeFetcher: any;
  deleteClassificationFetcher: any;
  addClassificationFetcher: any;
}) {
  const showUpgradeSyntax = Boolean(
    doenetmlVersionId &&
    allDoenetmlVersions.find((v) => v.id === doenetmlVersionId)?.deprecated,
  );

  // Hide the stable embed code until we determine if this is a feature users want

  // const [copiedEmbedCode, setCopiedEmbedCode] = useState(false);

  // async function generateEmbedCode() {
  //   const {
  //     data: { cid },
  //   } = await axios.post(`/api/updateContent/createContentRevision`, {
  //     contentId,
  //     revisionName: "Embed code revision",
  //     note: "Creating an embed code pinned to this revision",
  //   });
  //   const embedCode = `<iframe src="${window.location.origin}/embed/${cid}" width="100%" height="800" style="border: 0"></iframe>`;

  //   return embedCode;
  // }

  return (
    <BlueBanner headerHeight={headerHeight}>
      <VStack ml="10px" spacing="2rem" align="flex-start">
        <Box>
          <Heading size="md" pt="1rem">
            Assignment
          </Heading>
          <EditAssignmentSettings
            contentId={contentId}
            maxAttempts={maxAttempts}
            individualizeByStudent={individualizeByStudent}
            mode={mode}
            includeMode={contentType !== "singleDoc"}
            maxAttemptsFetcher={maxAttemptsFetcher}
            variantFetcher={variantFetcher}
            modeFetcher={modeFetcher}
          />
        </Box>

        <Box>
          <EditCategories
            contentId={contentId}
            categories={categories}
            allCategories={allCategories}
            showRequired={showRequired}
          />
        </Box>

        <Box>
          <Heading size="md">Classifications</Heading>
          <Box ml="1rem">
            <EditClassifications
              contentId={contentId}
              classifications={classifications}
              deleteClassificationFetcher={deleteClassificationFetcher}
              addClassificationFetcher={addClassificationFetcher}
            />
          </Box>
        </Box>

        <Box>
          <Heading size="md">Licensing</Heading>
          <Box ml="1rem" mr="2rem">
            {inLibrary ? (
              <AuthorLicenseBox
                license={allLicenses.find((l) => l.code === licenseCode)!}
                contentTypeName={"document"}
                isShared={isPublic || isShared}
                skipExplanation={false}
              />
            ) : (
              <EditLicense
                contentId={contentId}
                code={licenseCode ?? null}
                remixSourceLicenseCode={remixSourceLicenseCode}
                isPublic={isPublic}
                isShared={isShared}
                allLicenses={allLicenses}
              />
            )}
          </Box>
        </Box>

        {doenetmlVersionId && (
          <Box>
            <Heading size="md">Version</Heading>
            <Box ml="1rem">
              <DoenetMLSelectionBox
                contentId={contentId}
                versionId={doenetmlVersionId}
                allVersions={allDoenetmlVersions}
                isAssigned={assigned}
              />
            </Box>
          </Box>
        )}

        {showUpgradeSyntax && (
          <Box>
            <Heading size="md">Upgrade document to version 0.7 syntax</Heading>
            <UpgradeSyntax
              contentId={contentId}
              allVersions={allDoenetmlVersions}
            />
          </Box>
        )}

        {/* Hide the stable embed code until we determine if this is a feature users want */}
        {/* <Box>
          <Heading size="md">Advanced</Heading>
          <Box ml="1rem" mt="1rem">
            <Text>
              Generate a stable embed code for the current revision of this
              document. The embedded content will not change if this document is
              revised.
            </Text>
            <Tooltip
              label="Embed this content in another website or LMS using an iframe."
              hasArrow
              openDelay={500}
            >
              <Button
                size="sm"
                colorScheme="blue"
                mt="1em"
                onClick={async () => {
                  const embedCode = await generateEmbedCode();
                  navigator.clipboard.writeText(embedCode);
                  setCopiedEmbedCode(true);
                }}
              >
                {copiedEmbedCode ? (
                  <IoMdCheckmark fontSize="1.2rem" />
                ) : (
                  <FiCode fontSize="1.2rem" />
                )}
                <Text ml="0.5rem">Copy stable embed code</Text>
              </Button>
            </Tooltip>
          </Box>
        </Box> */}
      </VStack>
    </BlueBanner>
  );
}

/**
 * This page allows you to view and change the settings for your activity.
 * Container component that handles React Router integration.
 * Context: `documentEditor` and `compoundEditor`
 */
export function EditorSettingsMode() {
  const {
    isPublic,
    isShared,
    assigned,
    mode,
    maxAttempts,
    individualizeByStudent,
    licenseCode,
    categories,
    classifications,
    remixSourceLicenseCode,
    allCategories,
    doenetmlVersionId,
    contentId,
  } = useLoaderData() as {
    isPublic: boolean;
    isShared: boolean;
    assigned: boolean;
    mode: AssignmentMode;
    maxAttempts: number;
    individualizeByStudent: boolean;
    licenseCode: LicenseCode | null;
    categories: Category[];
    classifications: ContentClassification[];
    remixSourceLicenseCode: LicenseCode | null;
    allCategories: CategoryGroup[];
    doenetmlVersionId?: number;
    contentId: string;
  };

  const {
    allLicenses,
    allDoenetmlVersions,
    inLibrary,
    contentType,
    headerHeight,
  } = useOutletContext<EditorContext>();

  const [searchParams, _] = useSearchParams();
  const showRequired = searchParams.get("showRequired") === null ? false : true;

  // Create fetchers for EditAssignmentSettings sub-components
  const maxAttemptsFetcher = useFetcher();
  const variantFetcher = useFetcher();
  const modeFetcher = useFetcher();

  // Create fetchers for EditClassifications
  const deleteClassificationFetcher = useFetcher();
  const addClassificationFetcher = useFetcher();

  return (
    <EditorSettingsModeComponent
      isPublic={isPublic}
      isShared={isShared}
      assigned={assigned}
      mode={mode}
      maxAttempts={maxAttempts}
      individualizeByStudent={individualizeByStudent}
      licenseCode={licenseCode}
      categories={categories}
      classifications={classifications}
      remixSourceLicenseCode={remixSourceLicenseCode}
      allCategories={allCategories}
      doenetmlVersionId={doenetmlVersionId}
      contentId={contentId}
      allLicenses={allLicenses}
      allDoenetmlVersions={allDoenetmlVersions}
      inLibrary={inLibrary}
      contentType={contentType}
      headerHeight={headerHeight}
      showRequired={showRequired}
      maxAttemptsFetcher={maxAttemptsFetcher}
      variantFetcher={variantFetcher}
      modeFetcher={modeFetcher}
      deleteClassificationFetcher={deleteClassificationFetcher}
      addClassificationFetcher={addClassificationFetcher}
    />
  );
}
