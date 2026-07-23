-- Track which npm dist-tag of @doenet/standalone a doenetmlVersions row follows.
-- Lets an external call pin `fullVersion` to a concrete version on publish so the
-- jsDelivr bundle URL is immutable (browser-cacheable) instead of a moving tag.
ALTER TABLE `doenetmlVersions`
  ADD COLUMN `trackingNpmTag` VARCHAR(191) NULL;

-- Backfill the existing tracking channels (idempotent). The `0.6` row stays NULL
-- so it is never auto-updated. `fullVersion` is left as the tag string here and
-- gets pinned to a concrete version by the first publish (or a manual call).
UPDATE `doenetmlVersions` SET `trackingNpmTag` = 'latest' WHERE `displayedVersion` = '0.7';
UPDATE `doenetmlVersions` SET `trackingNpmTag` = 'dev'    WHERE `displayedVersion` = '0.7dev';

-- At most one row may track a given tag (MySQL permits multiple NULLs).
CREATE UNIQUE INDEX `doenetmlVersions_trackingNpmTag_key` ON `doenetmlVersions`(`trackingNpmTag`);
