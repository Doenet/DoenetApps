import { License, LicenseCode } from "../../types";
import { InfoIcon } from "@chakra-ui/icons";
import { Box, FormControl, FormLabel, Select, Text } from "@chakra-ui/react";
import { useFetcher } from "react-router";
import { optimistic } from "../../utils/optimistic_ui";
import { AuthorLicenseBox } from "../Licenses";

/**
 * This widget allows owners to view / edit the license on their activity.
 * Visually, it's a dropdown with a description box underneath.
 *
 * If this activity is a remix, this widget ensures the owner can only select
 * compatible licenses. `remixSourceLicenseCode` should be the LicenseCode of the source activity, if it exists.
 */
export function EditLicense({
  contentId,
  code,
  remixSourceLicenseCode,
  isPublic,
  isShared,
  allLicenses,
}: {
  contentId: string;
  code: LicenseCode | null;
  remixSourceLicenseCode: LicenseCode | null;
  isPublic: boolean;
  isShared: boolean;
  allLicenses: License[];
}) {
  const fetcher = useFetcher();

  const optimisticCode = optimistic<LicenseCode | null>(
    fetcher,
    "licenseCode",
    code ?? null,
  );
  const license = allLicenses.find((l) => l.code === optimisticCode);

  const determinedFromRemixSource =
    remixSourceLicenseCode !== "CCDUAL" && remixSourceLicenseCode !== null;
  const sharedNoLicense = (isPublic || isShared) && optimisticCode === null;

  const sharedNoLicenseWarning = sharedNoLicense ? (
    <Box
      marginTop="10px"
      border="2px solid black"
      background="orange.100"
      padding="5px"
    >
      <InfoIcon color="orange.500" mr="2px" /> This document is shared without
      specifying a license. Please select a license below to inform other how
      they can use your content.
    </Box>
  ) : null;

  return (
    <>
      <FormControl>
        <FormLabel color={fetcher.state === "idle" ? "black" : "gray"}>
          This document {isPublic || isShared ? "is" : "will be"} shared under
          the following license(s)
        </FormLabel>
        <Select
          isDisabled={determinedFromRemixSource}
          data-test="Select License"
          placeholder={optimisticCode ? undefined : "Select license"}
          value={optimisticCode ?? undefined}
          onChange={(e) => {
            fetcher.submit(
              {
                path: "share/setContentLicense",
                contentId,
                licenseCode: e.target.value as LicenseCode,
              },
              { method: "post", encType: "application/json" },
            );
          }}
        >
          {allLicenses.map((license) => (
            <option value={license.code} key={license.code}>
              {license.name}
            </option>
          ))}
        </Select>
      </FormControl>
      {determinedFromRemixSource && (
        <Text>
          (Cannot change license since remixed from activity with this license.)
        </Text>
      )}

      {sharedNoLicenseWarning}
      {license && (
        <>
          <AuthorLicenseBox
            license={license}
            contentTypeName={"document"}
            isShared={isPublic || isShared}
            skipExplanation={true}
          />
        </>
      )}
    </>
  );
}
