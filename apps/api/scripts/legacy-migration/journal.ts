// Append-only journal of everything created on the target site, doubling as
// the id-mapping deliverable (build/id-map.tsv). Each row is flushed to disk
// before the next create, so an interrupted import can resume: any
// (kind, legacyId, ownerEmail) already journaled is skipped on re-run.
import fs from "node:fs";
import path from "node:path";

export interface JournalRow {
  kind: "user" | "folder" | "activity" | "page" | "image";
  legacyId: string;
  legacyCourseId: string;
  ownerEmail: string;
  newId: string;
  newType: string;
  name: string;
  notes: string;
}

const HEADER = [
  "kind",
  "legacyId",
  "legacyCourseId",
  "ownerEmail",
  "newId",
  "newType",
  "name",
  "notes",
].join("\t");

function sanitize(value: string): string {
  return value.replace(/[\t\n\r]+/g, " ");
}

export class Journal {
  private rows = new Map<string, JournalRow>();
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    if (fs.existsSync(filePath)) {
      const lines = fs.readFileSync(filePath, "utf8").split("\n");
      for (const line of lines.slice(1)) {
        if (line.trim() === "") continue;
        const [
          kind,
          legacyId,
          legacyCourseId,
          ownerEmail,
          newId,
          newType,
          name,
          notes,
        ] = line.split("\t");
        this.rows.set(this.key(kind, legacyId, ownerEmail), {
          kind: kind as JournalRow["kind"],
          legacyId,
          legacyCourseId,
          ownerEmail,
          newId,
          newType,
          name,
          notes: notes ?? "",
        });
      }
    } else {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, HEADER + "\n");
    }
  }

  private key(kind: string, legacyId: string, ownerEmail: string): string {
    return `${kind}\t${legacyId}\t${ownerEmail.toLowerCase()}`;
  }

  get(
    kind: string,
    legacyId: string,
    ownerEmail: string,
  ): JournalRow | undefined {
    return this.rows.get(this.key(kind, legacyId, ownerEmail));
  }

  /** True if any row exists for this owner (used for the duplicate-folder guard). */
  hasAnyForOwner(ownerEmail: string): boolean {
    const suffix = `\t${ownerEmail.toLowerCase()}`;
    for (const key of this.rows.keys()) {
      if (key.endsWith(suffix)) return true;
    }
    return false;
  }

  append(row: JournalRow) {
    const key = this.key(row.kind, row.legacyId, row.ownerEmail);
    if (this.rows.has(key)) {
      throw new Error(`Duplicate journal row: ${key}`);
    }
    this.rows.set(key, row);
    const line = [
      row.kind,
      sanitize(row.legacyId),
      sanitize(row.legacyCourseId),
      sanitize(row.ownerEmail),
      sanitize(row.newId),
      sanitize(row.newType),
      sanitize(row.name),
      sanitize(row.notes),
    ].join("\t");
    fs.appendFileSync(this.filePath, line + "\n");
  }

  get size(): number {
    return this.rows.size;
  }

  allRows(): JournalRow[] {
    return [...this.rows.values()];
  }
}
