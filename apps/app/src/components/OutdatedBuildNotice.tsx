import { useEffect, useState } from "react";
import { Button, Text, VStack } from "@chakra-ui/react";

import { CLIENT_BUILD, isOutdatedBuild } from "../utils/clientBuild";

/**
 * Shown on the error page when the deployed build is no longer the one this
 * tab is running (usually newer; after a rollback, older). Such a tab can
 * fail against an API that has since changed, and a reload is then the fix.
 * Renders nothing otherwise.
 */
export function OutdatedBuildNotice({
  build = CLIENT_BUILD,
}: {
  build?: string;
}) {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isOutdatedBuild(build).then((result) => {
      if (!cancelled) {
        setOutdated(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [build]);

  if (!outdated) {
    return null;
  }

  return (
    <VStack paddingTop="24px" data-test="Outdated Build Notice">
      <Text>
        Doenet has been updated since this page was opened. Reloading the page
        may fix this.
      </Text>
      <Button colorScheme="blue" onClick={() => window.location.reload()}>
        Reload
      </Button>
    </VStack>
  );
}
