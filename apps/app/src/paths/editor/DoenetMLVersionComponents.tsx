/**
 * UI helpers for selecting and upgrading DoenetML versions in the editor.
 * Used in EditorSettingsMode.
 */

import { useState } from "react";
import { FetcherWithComponents, useFetcher } from "react-router";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  FormControl,
  FormLabel,
  Select,
} from "@chakra-ui/react";
import { DoenetmlVersion } from "../../types";
import axios from "axios";
import { optimistic } from "../../utils/optimistic_ui";
import { updateSyntaxFromV06toV07 } from "@doenet/v06-to-v07";

/**
 * Renders a DoenetML version selector.
 * Saves the selection to the server.
 */
export function DoenetMLSelectionBox({
  contentId,
  versionId,
  allVersions,
  isAssigned,
}: {
  contentId: string;
  versionId: number;
  allVersions: DoenetmlVersion[];
  isAssigned: boolean;
}) {
  const fetcher = useFetcher();

  const optimisticVersionId = optimistic(
    fetcher,
    "doenetmlVersionId",
    versionId,
  );
  const optimisticVersion = allVersions.find(
    (v) => v.id === optimisticVersionId,
  )!;

  return (
    <>
      {optimisticVersion?.deprecated && (
        <Alert status="warning">
          <AlertIcon />
          <AlertTitle>
            DoenetML version {optimisticVersion.displayedVersion} is deprecated.
          </AlertTitle>
          <AlertDescription>
            {optimisticVersion.deprecationMessage}
          </AlertDescription>
        </Alert>
      )}
      <FormControl display="flex" alignItems="center" gap={1}>
        <FormLabel
          size="sm"
          color={fetcher.state !== "idle" ? "gray" : "black"}
          mb={0}
        >
          Use DoenetML version
        </FormLabel>
        <Select
          width="6rem"
          value={optimisticVersionId}
          isDisabled={isAssigned}
          onChange={(e) => {
            const newVersionId = Number(e.target.value);
            fetcher.submit(
              {
                path: "updateContent/updateContentSettings",
                contentId,
                doenetmlVersionId: newVersionId,
              },
              { method: "post", encType: "application/json" },
            );
          }}
        >
          {allVersions.map((version) => (
            <option value={version.id} key={version.id}>
              {version.displayedVersion}
            </option>
          ))}
        </Select>
      </FormControl>

      {isAssigned && (
        <p>
          <strong>Note</strong>: Cannot modify DoenetML version since activity
          is assigned.
        </p>
      )}
    </>
  );
}

/**
 * Renders a button to upgrade content syntax to DoenetML 0.7.
 */
export function UpgradeSyntax({
  contentId,
  allVersions,
}: {
  contentId: string;
  allVersions: DoenetmlVersion[];
}) {
  const fetcher = useFetcher();

  const [upgradeInitiated, setUpgradeInitiated] = useState(false);

  const targetVersion = allVersions.find((v) => v.displayedVersion === "0.7");

  if (!targetVersion) {
    console.warn('No DoenetML version "0.7" found in available versions.', {
      contentId,
      allVersions,
    });
    return null;
  }

  const newVersionId = targetVersion.id;

  return (
    <Button
      colorScheme="blue"
      size="sm"
      onClick={() => {
        setUpgradeInitiated(true);
        performSyntaxUpgrade(contentId, fetcher, newVersionId);
      }}
      ml="10px"
      mt="15px"
      disabled={upgradeInitiated}
    >
      Upgrade to version 0.7
    </Button>
  );
}

/**
 * Fetches content, upgrades the DoenetML syntax from 0.6 to 0.7,
 * and submits the updated source plus version ID to the server.
 */
async function performSyntaxUpgrade(
  contentId: string,
  fetcher: FetcherWithComponents<any>,
  newVersionId: number,
) {
  const { data } = await axios.get(
    `/api/activityEditView/getContentSource/${contentId}`,
  );

  const source: string = data.source;

  const update = await updateSyntaxFromV06toV07(source);
  const upgraded = update.xml;

  if (update.vfile.messages.length > 0) {
    console.warn(
      "There were warnings during syntax update:",
      update.vfile.messages,
    );
  }

  fetcher.submit(
    {
      path: "updateContent/saveSyntaxUpdate",
      contentId,
      updatedDoenetmlVersionId: newVersionId,
      updatedSource: upgraded,
    },
    { method: "post", encType: "application/json" },
  );
}
