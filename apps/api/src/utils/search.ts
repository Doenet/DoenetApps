/**
 * Remove operators that break MySQL BOOLEAN search and add * at the end of every word so that match beginning of words
 * @returns sanitized query
 */
export function sanitizeQuery(query: string) {
  const query_as_prefixes = query
    .replace(/[+\-><()~*"@]+/g, " ")
    .split(" ")
    .filter((s) => s)
    .map((s) => s + "*")
    .join(" ");
  return query_as_prefixes;
}
