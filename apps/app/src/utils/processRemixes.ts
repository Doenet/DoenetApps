import { DateTime } from "luxon";
import { ActivityRemixItem } from "../types";

export function processRemixes(remixes: any[]) {
  const items: ActivityRemixItem[] = remixes
    .map((remix) => ({
      ...remix,
      originContent: {
        ...remix.originContent,
        timestamp: DateTime.fromISO(remix.originContent.timestamp),
      },
      remixContent: {
        ...remix.remixContent,
        timestamp: DateTime.fromISO(remix.remixContent.timestamp),
      },
    }))
    .sort((a, b) =>
      a.directCopy === b.directCopy ? 0 : a.directCopy ? -1 : 1,
    );

  return items;
}
