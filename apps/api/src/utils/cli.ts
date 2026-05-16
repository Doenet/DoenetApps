const ansiReset = "\x1b[0m";
const shouldUseAnsiColors =
  process.env.NO_COLOR === undefined && process.env.FORCE_COLOR !== "0";

const ansiStyles = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
} as const;

function styleCli(text: string, ...codes: string[]) {
  if (!shouldUseAnsiColors) {
    return text;
  }

  return `${codes.join("")}${text}${ansiReset}`;
}

export function formatApiReadyMessage(localUrl: string) {
  return [
    "",
    `  ${styleCli("API", ansiStyles.bold, ansiStyles.green)} ${styleCli("ready", ansiStyles.dim)}`,
    "",
    `  ${styleCli("Local:", ansiStyles.dim)} ${styleCli(localUrl, ansiStyles.cyan)}`,
    "",
  ].join("\n");
}
