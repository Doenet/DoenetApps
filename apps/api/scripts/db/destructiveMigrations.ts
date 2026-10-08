/**
 * Finds statements in a migration that can break the backend code still
 * running while it is applied. Migrations run when each new ECS task starts
 * (see entrypoint.sh), while tasks running the previous code keep serving.
 */

export type Finding = { statement: string; reason: string };

/** Rules applied to each clause of each statement, in upper case. */
const rules: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /^DROP\s+TABLE\b/,
    reason: "drops a table the running code may still use",
  },
  {
    pattern: /^ALTER\s+TABLE\b.*\bDROP\s+(COLUMN\s+)?`/,
    reason: "drops a column the running code may still use",
  },
  {
    pattern: /\bRENAME\b/,
    reason: "renames a table or column the running code uses by its old name",
  },
  {
    pattern: /^ALTER\s+TABLE\b.*\b(MODIFY|CHANGE)\b/,
    reason:
      "changes a column's type or nullability, which can reject the running code's writes",
  },
  {
    pattern: /\bADD\s+(COLUMN\s+)?`[^`]+`(?!.*\bDEFAULT\b).*\bNOT\s+NULL\b/,
    reason:
      "adds a NOT NULL column without a default, so the running code's inserts fail",
  },
  {
    pattern: /\b(ADD\s+UNIQUE|CREATE\s+UNIQUE\s+INDEX)\b/,
    reason: "adds a unique constraint the running code's writes may violate",
  },
  { pattern: /^TRUNCATE\b/, reason: "deletes all rows of a table" },
];

function statements(sql: string): string[] {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s !== "");
}

/** Split `ALTER TABLE t ADD ..., DROP ...` into its clauses. */
function clauses(statement: string): string[] {
  const match = /^(ALTER\s+TABLE\s+\S+)\s+(.*)$/i.exec(statement);
  if (!match) {
    return [statement];
  }
  return match[2]
    .split(/,(?=\s*(?:ADD|DROP|MODIFY|CHANGE|RENAME|ALTER)\b)/i)
    .map((clause) => `${match[1]} ${clause.trim()}`);
}

export function findDestructiveStatements(sql: string): Finding[] {
  const findings: Finding[] = [];
  for (const statement of statements(sql)) {
    for (const clause of clauses(statement)) {
      const upper = clause.toUpperCase();
      for (const { pattern, reason } of rules) {
        if (pattern.test(upper)) {
          findings.push({ statement: clause, reason });
          break;
        }
      }
    }
  }
  return findings;
}
