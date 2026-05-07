import { Text, Tooltip } from "@chakra-ui/react";
import { intWithCommas } from "./formatting";

export function numItemsBadge({
  numCurated,
  numCommunity,
}: {
  numCurated?: number;
  numCommunity?: number;
}) {
  const n = intWithCommas((numCurated ?? 0) + (numCommunity ?? 0));

  return (
    <Tooltip
      label={numPhraseDisplay({ numCurated, numCommunity })}
      openDelay={500}
    >
      <Text fontSize="smaller">({n})</Text>
    </Tooltip>
  );
}

function numPhraseDisplay({
  numCurated,
  numCommunity,
}: {
  numCurated?: number;
  numCommunity?: number;
}) {
  const nl = intWithCommas(numCurated || 0);
  const nc = intWithCommas(numCommunity || 0);

  return `${nl} curated item${nl === "1" ? "" : "s"} and ${nc} community item${nc === "1" ? "" : "s"}`;
}

export function clearQueryParameter(param: string, search: string) {
  function escapeRegex(inputStr: string) {
    return inputStr.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
  }
  const escapedParam = escapeRegex(param);

  let newSearch = search;
  newSearch = newSearch.replace(new RegExp(`&?${escapedParam}(=[^&]*)?`), "");
  if (newSearch === "?") {
    newSearch = "";
  }
  if (newSearch.substring(0, 2) === "?&") {
    newSearch = "?" + newSearch.slice(2);
  }
  return newSearch;
}
