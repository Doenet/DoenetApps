/**
 * The number of copies of a document that a problem set contains.
 *
 * The document is repeated `repeatInProblemSet` times, capped by the number of
 * variants it has: each copy uses a different variant, and `numVariants` can
 * drop below a previously saved `repeatInProblemSet` (by editing the source or
 * reverting the document to an earlier revision).
 *
 * Both activity compilers and the gradebook's item names go through this, so
 * that the item count derived for the gradebook matches the compiled activity.
 */
export function repeatCountInProblemSet(doc: {
  repeatInProblemSet?: number;
  numVariants?: number;
}) {
  return Math.max(
    1,
    Math.min(doc.repeatInProblemSet ?? 1, doc.numVariants ?? 1),
  );
}
