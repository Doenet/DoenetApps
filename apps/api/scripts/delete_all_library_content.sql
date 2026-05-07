DELETE FROM libraryEvents;

DELETE libraryActivityInfos, content FROM libraryActivityInfos
-- Note: we're deleting library-owned content, hence we use `.contentId` and definitely not `.sourceId`
LEFT JOIN content ON libraryActivityInfos.contentId = content.id;