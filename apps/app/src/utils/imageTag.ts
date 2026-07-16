// Escape a value for use inside a double-quoted XML/DoenetML attribute.
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attr(name: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? ` ${name}="${escapeAttr(trimmed)}"` : "";
}

/**
 * Builds the DoenetML `<image>` tag for an uploaded image content item,
 * including its attribution/licensing. The attribution fields map onto the
 * DoenetML `<image>` attributes (`imageName`, `authorName`, `authorUrl`,
 * `originalUrl`, `licenseCodes`, `licenseVersion`); the DoenetML worker turns
 * them into the rendered credit sentence. Fields that are empty are omitted so
 * the tag stays terse.
 */
export function buildImageTag(image: {
  imageSource?: string | null;
  imageTitle?: string | null;
  imageAuthorName?: string | null;
  imageAuthorUrl?: string | null;
  imageOriginalUrl?: string | null;
  imageLicenseCodes?: string | null;
  imageLicenseVersion?: string | null;
}): string {
  return (
    `<image source="${escapeAttr(image.imageSource ?? "")}"` +
    attr("imageName", image.imageTitle) +
    attr("authorName", image.imageAuthorName) +
    attr("authorUrl", image.imageAuthorUrl) +
    attr("originalUrl", image.imageOriginalUrl) +
    attr("licenseCodes", image.imageLicenseCodes) +
    attr("licenseVersion", image.imageLicenseVersion) +
    ` />`
  );
}
