export function formatBytes(bytes: number) {
  const marker = 1024; // Change to 1000 if required
  const decimal = 1; // Change as required
  const kiloBytes = marker;
  const megaBytes = marker * marker;
  const gigaBytes = marker * marker * marker;
  const teraBytes = marker * marker * marker * marker;

  if (bytes < kiloBytes) return bytes + " Bytes";
  else if (bytes < megaBytes)
    return (bytes / kiloBytes).toFixed(decimal) + " KB";
  else if (bytes < gigaBytes)
    return (bytes / megaBytes).toFixed(decimal) + " MB";
  else if (bytes < teraBytes)
    return (bytes / gigaBytes).toFixed(decimal) + " GB";
  else return (bytes / teraBytes).toFixed(decimal) + " TB";
}

export function intWithCommas(num: number | undefined) {
  const startAtLeastFourNumRegex = /^(-?\d+)(\d{3})/;
  let numString = (num ?? 0).toString();

  let matchObj = numString.match(startAtLeastFourNumRegex);
  while (matchObj !== null) {
    numString = numString.replace(startAtLeastFourNumRegex, `$1,$2`);
    matchObj = numString.match(startAtLeastFourNumRegex);
  }
  return numString;
}
