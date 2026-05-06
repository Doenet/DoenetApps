/**
 * This module is responsible for updating and managing content audits
 * (such as tracking doenetml errors and accessibility violations).
 *
 * It provides helpers to get audit data from the database, reason about
 * content using that data, and update the audits as needed.
 *
 * This module deals with content on a per-node basis. It does not
 * make any assumptions about how the audit system and the folder
 * tree interact.
 */

export * from "./content-audit";
