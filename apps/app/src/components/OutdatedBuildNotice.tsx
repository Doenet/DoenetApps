import { useEffect, useState } from "react";
import { Button, Text, VStack } from "@chakra-ui/react";

import { CLIENT_BUILD, isOutdatedBuild } from "../utils/clientBuild";

/**
 * Shown on the error page when the deployed build is no longer the one this
 * tab is running (usually newer; after a rollback, older). Such a tab can
 * fail against an API that has since changed, and a reload is then the fix.
 * Otherwise its wrapper stays empty.
 */
export function OutdatedBuildNotice({
  build = CLIENT_BUILD,
}: {
  build?: string;
}) {
  const [state, setState] = useState<"checking" | "current" | "outdated">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;
    setState("checking");
    isOutdatedBuild(build).then((outdated) => {
      if (!cancelled) {
        setState(outdated ? "outdated" : "current");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [build]);

  // The wrapper is always rendered, empty unless outdated, so tests can wait
  // for the check to finish (`data-state`) before asserting there's no notice.
  return (
    <div data-test="Outdated Build Notice" data-state={state}>
      {state === "outdated" && (
        <VStack paddingTop="24px">
          <Text>
            Doenet has been updated since this page was opened. Reloading the
            page may fix this.
          </Text>
          <Button colorScheme="blue" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </VStack>
      )}
    </div>
  );
}
