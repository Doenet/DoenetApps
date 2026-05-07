import { download, generateCsv, mkConfig } from "export-to-csv";
import { UserInfo } from "../types";

export function downloadStudentAccountCredentialsToCsv({
  title,
  accounts,
}: {
  title: string;
  accounts: { handle: string; password: string }[];
}) {
  const csvConfig = mkConfig({
    useKeysAsHeaders: true,
    filename: title,
  });
  const data = accounts.map(({ handle, password }) => ({
    Username: handle,
    Password: password,
  }));
  const csv = generateCsv(csvConfig)(data);
  download(csvConfig)(csv);
}

export function downloadScoresToCsv({
  title,
  orderedStudents,
  orderedAssignments,
  scores,
}: {
  title: string;
  orderedStudents: UserInfo[];
  orderedAssignments: string[];
  scores: (number | null)[][];
}) {
  const csvConfig = mkConfig({
    useKeysAsHeaders: true,
    filename: title,
  });

  const assignmentsNoDuplicates = new Set(orderedAssignments);
  if (assignmentsNoDuplicates.size !== orderedAssignments.length) {
    alert(
      "There are duplicate assignment names. Please rename assignments to have unique names before downloading scores.",
    );
    return;
  }
  if (scores.length === 0) {
    alert("There are no scores to download.");
    return;
  }

  const data = scores.map((studentScores, i) => {
    const { firstNames, lastNames, userId } = orderedStudents[i];
    const formattedScores: Record<string, number | ""> = {};
    for (const [j, score] of studentScores.entries()) {
      const assignmentName = orderedAssignments[j];
      formattedScores[assignmentName] = score === null ? "" : score * 100;
    }

    return {
      "First name": firstNames,
      "Last name": lastNames,
      "Student ID": userId,
      ...formattedScores,
    };
  });

  const csv = generateCsv(csvConfig)(data);
  download(csvConfig)(csv);
}
