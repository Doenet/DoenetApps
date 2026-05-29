/**
 * This module owns the shape and invariants of the content tree — the
 * parent/child structure that holds docs, folders, sequences, selects, and
 * images.
 *
 * It does not own per-node concerns (sharing, licensing, course membership,
 * audits, etc.); it consults those systems where its invariants depend on
 * them — for example, `prepareNewChild` reads parent visibility and sharing
 * to compute what a new child inherits.
 */

export * from "./content-tree";
