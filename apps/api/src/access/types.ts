import type { Visibility } from "@prisma/client";

export interface AccessPolicy {
  visibility: Visibility;
  // Future: include `editors`, `viewers`, etc. here as needed
}
