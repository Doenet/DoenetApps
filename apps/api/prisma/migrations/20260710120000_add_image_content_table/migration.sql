-- Move image-specific data into a dedicated 1:1 `imageContent` table.
--
-- Uploaded images now use DoenetML's `<image>` attribution model (author, title,
-- source, license) instead of the activity-level `licenseCode`. Housing this in
-- its own table (one row per image) lets `licenseCodes` be a genuinely required
-- NOT NULL column that Prisma models directly — so an image can never be stored
-- unlicensed, with no unmodeled CHECK constraint needed.

-- CreateTable
CREATE TABLE `imageContent` (
  `contentId` BINARY(16) NOT NULL,
  `mimeType` VARCHAR(64) NULL,
  `sizeBytes` BIGINT NULL,
  `storageKey` VARCHAR(255) NULL,
  `authorName` VARCHAR(255) NULL,
  `authorUrl` TEXT NULL,
  `title` VARCHAR(255) NULL,
  `originalUrl` TEXT NULL,
  `licenseCodes` VARCHAR(64) NOT NULL,
  `licenseVersion` VARCHAR(16) NULL,
  PRIMARY KEY (`contentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing images: carry over the stored-object metadata and derive the
-- required license from the activity-level `licenseCode` the image already
-- carried (inherited at upload), rather than inventing one. `CCDUAL` maps to the
-- two Creative Commons licenses it composes; any other/unknown value falls back
-- to the platform-standard CC-BY-SA.
INSERT INTO `imageContent`
  (`contentId`, `mimeType`, `sizeBytes`, `storageKey`, `licenseCodes`)
SELECT
  `id`, `mimeType`, `sizeBytes`, `storageKey`,
  CASE `licenseCode`
    WHEN 'CCBYSA' THEN 'CC-BY-SA'
    WHEN 'CCBYNCSA' THEN 'CC-BY-NC-SA'
    WHEN 'CCDUAL' THEN 'CC-BY-SA CC-BY-NC-SA'
    ELSE 'CC-BY-SA'
  END
FROM `content`
WHERE `type` = 'image';

-- AddForeignKey
ALTER TABLE `imageContent`
  ADD CONSTRAINT `imageContent_contentId_fkey`
  FOREIGN KEY (`contentId`) REFERENCES `content`(`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Drop the now-relocated image columns from `content`.
ALTER TABLE `content`
  DROP COLUMN `mimeType`,
  DROP COLUMN `sizeBytes`,
  DROP COLUMN `storageKey`;
