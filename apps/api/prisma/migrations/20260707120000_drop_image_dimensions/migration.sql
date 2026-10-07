-- AlterTable: drop unused image dimension columns.
-- `imageWidth`/`imageHeight` were captured server-side while the API still
-- proxied the bytes. After the move to direct-to-S3 uploads the server no
-- longer sees the bytes, nothing reads these columns, and they were only ever
-- client-declared. Remove them rather than store untrusted, unused data.
ALTER TABLE `content` DROP COLUMN `imageWidth`,
    DROP COLUMN `imageHeight`;
