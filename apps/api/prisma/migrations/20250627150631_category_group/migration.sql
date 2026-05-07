-- Drop promoted content, we're not using it
ALTER TABLE `promotedContent` DROP FOREIGN KEY `promotedContent_promotedGroupId_fkey`;
ALTER TABLE `promotedContent` DROP FOREIGN KEY `promotedContent_contentId_fkey`;
DROP TABLE `promotedContent`;
DROP TABLE `promotedContentGroups`;

-- Drop foreign keys and indexes
ALTER TABLE `_contentTocontentFeatures`
    DROP FOREIGN KEY `_contentTocontentFeatures_A_fkey`,
    DROP FOREIGN KEY `_contentTocontentFeatures_B_fkey`,
    DROP INDEX `_contentTocontentFeatures_AB_unique`,
    DROP INDEX `_contentTocontentFeatures_B_index`;

-- Fix the implicit many-to-many table to match Prisma's expectations
ALTER TABLE `_contentTocontentFeatures` RENAME `_categoriesTocontent`;
-- Switch the names of the columns to match the new name
-- A should refer to categories now, not content
-- B should refer to content now, not categories/features
ALTER TABLE `_categoriesTocontent` RENAME COLUMN `A` TO `TEMP`;
ALTER TABLE `_categoriesTocontent` RENAME COLUMN `B` TO `A`;
ALTER TABLE `_categoriesTocontent` RENAME COLUMN `TEMP` TO `B`;

ALTER TABLE `_categoriesTocontent`
    ADD UNIQUE INDEX `_categoriesTocontent_AB_unique`(`A`, `B`),
    ADD INDEX `_categoriesTocontent_B_index`(`B`);

-- Add category groups table
CREATE TABLE `categoryGroups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isExclusive` BOOLEAN NOT NULL DEFAULT false,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    UNIQUE INDEX `categoryGroups_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Rename contentFeatures table and add optional reference to group Id
-- Later, in another migration, we will make this field required!
ALTER TABLE `contentFeatures`
    RENAME `categories`,
    RENAME INDEX `contentFeatures_code_key` TO `categories_code_key`,
    RENAME INDEX `contentFeatures_term_key` TO `categories_term_key`,
    ADD COLUMN `groupId` INTEGER NULL;

-- Add foreign keys back
ALTER TABLE `categories` ADD CONSTRAINT `categories_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `categoryGroups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `_categoriesTocontent` ADD CONSTRAINT `_categoriesTocontent_A_fkey` FOREIGN KEY (`A`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `_categoriesTocontent` ADD CONSTRAINT `_categoriesTocontent_B_fkey` FOREIGN KEY (`B`) REFERENCES `content`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;