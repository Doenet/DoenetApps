-- Prod shape: aggregate distributions for sizing the perf dataset.
--
-- Read-only. Returns aggregate numbers only: no ids, names, emails or content.
-- Run against prod (ideally a read replica or a restored snapshot) about once a
-- semester and commit the output next to this file. See README.md.
--
-- Three result sets:
--   1. counts         metric | value
--   2. distributions  metric | groups | total | p50 | p95 | p99 | max
--   3. table sizes    table_name | approx_rows | data_mb | index_mb | avg_row_bytes
--
-- Distributions are over groups with at least one member: e.g.
-- `students_per_course` only covers courses with a student. The counts give
-- the number of empty groups where it matters. Percentiles are nearest-rank.
-- Deleted content (`isDeletedOn IS NOT NULL`) is excluded except where noted;
-- table sizes cover it.

SET SESSION TRANSACTION READ ONLY;

-- ============================================================
-- 1. Counts
-- ============================================================

SELECT 'users' AS metric, COUNT(*) AS value FROM users
UNION ALL SELECT 'users_anonymous', SUM(isAnonymous) FROM users
UNION ALL SELECT 'users_scoped_to_course', SUM(scopedToClassId IS NOT NULL) FROM users
UNION ALL SELECT 'users_premium', SUM(isPremium) FROM users
UNION ALL SELECT 'users_author', SUM(isAuthor) FROM users
UNION ALL SELECT 'users_editor', SUM(isEditor) FROM users
UNION ALL SELECT 'users_library', SUM(isLibrary) FROM users
UNION ALL SELECT 'users_owning_content', COUNT(DISTINCT ownerId) FROM content WHERE isDeletedOn IS NULL

UNION ALL SELECT 'content_deleted', COUNT(*) FROM content WHERE isDeletedOn IS NOT NULL
UNION ALL SELECT CONCAT('content_', type), COUNT(*) FROM content WHERE isDeletedOn IS NULL GROUP BY type
UNION ALL SELECT CONCAT('content_', visibility, '_', kind), COUNT(*) FROM (
    SELECT visibility,
      -- A content type added later lands in its own `unknown_<type>` row
      -- rather than being counted as one of these kinds.
      CASE
        WHEN type IN ('singleDoc', 'select', 'sequence') THEN 'activities'
        WHEN type = 'folder' THEN 'folders'
        WHEN type = 'image' THEN 'images'
        ELSE CONCAT('unknown_', type)
      END AS kind
    FROM content WHERE isDeletedOn IS NULL AND visibility <> 'private'
  ) v
  GROUP BY visibility, kind
UNION ALL SELECT 'content_owned_by_library_users', COUNT(*)
  FROM content c JOIN users u ON u.userId = c.ownerId
  WHERE c.isDeletedOn IS NULL AND u.isLibrary
UNION ALL SELECT CONCAT('library_infos_', l.status), COUNT(*)
  FROM libraryActivityInfos l JOIN content c ON c.id = l.contentId AND c.isDeletedOn IS NULL
  GROUP BY l.status

UNION ALL SELECT 'courses', COUNT(*) FROM content WHERE id = courseRootId AND isDeletedOn IS NULL
UNION ALL SELECT 'courses_with_students', COUNT(DISTINCT courseId) FROM (
    SELECT scopedToClassId AS courseId FROM users WHERE scopedToClassId IS NOT NULL
    UNION
    SELECT a.courseRootId FROM assignmentScores s JOIN content a ON a.id = s.contentId
    WHERE a.courseRootId IS NOT NULL AND a.isDeletedOn IS NULL
  ) cs
  JOIN content c ON c.id = cs.courseId AND c.isDeletedOn IS NULL
UNION ALL SELECT 'assignments', COUNT(*) FROM content WHERE isAssignmentRoot AND isDeletedOn IS NULL
UNION ALL SELECT 'assignments_in_courses', COUNT(*) FROM content
  WHERE isAssignmentRoot AND courseRootId IS NOT NULL AND isDeletedOn IS NULL
UNION ALL SELECT 'assignments_with_scores', COUNT(DISTINCT s.contentId)
  FROM assignmentScores s JOIN content a ON a.id = s.contentId AND a.isDeletedOn IS NULL

UNION ALL SELECT 'sessions', COUNT(*) FROM Session
UNION ALL SELECT 'sessions_expired', SUM(expiresAt < NOW()) FROM Session
UNION ALL SELECT 'sessions_unauthenticated', SUM(data NOT LIKE '%passport%') FROM Session;

-- ============================================================
-- 2. Distributions
-- ============================================================

WITH RECURSIVE
-- Depth of each live content item; items at the root of a user's tree are depth 1.
tree (id, depth) AS (
  SELECT id, 1 FROM content WHERE parentId IS NULL AND isDeletedOn IS NULL
  UNION ALL
  SELECT c.id, t.depth + 1
  FROM content c JOIN tree t ON c.parentId = t.id
  WHERE c.isDeletedOn IS NULL
),
-- A course's students: rostered (scoped) users plus anyone with a score on one
-- of its assignments, matching the course scores page.
course_students (courseId, userId) AS (
  SELECT scopedToClassId, userId FROM users WHERE scopedToClassId IS NOT NULL
  UNION
  SELECT a.courseRootId, s.userId
  FROM assignmentScores s JOIN content a ON a.id = s.contentId
  WHERE a.courseRootId IS NOT NULL AND a.isDeletedOn IS NULL
),
samples (metric, v) AS (
  SELECT 'students_per_course', COUNT(*)
  FROM course_students cs JOIN content c ON c.id = cs.courseId AND c.isDeletedOn IS NULL
  GROUP BY cs.courseId

  UNION ALL SELECT 'students_per_assignment', COUNT(*)
  FROM assignmentScores s JOIN content a ON a.id = s.contentId AND a.isDeletedOn IS NULL
  GROUP BY s.contentId

  UNION ALL SELECT 'assignments_per_course', COUNT(*)
  FROM content
  WHERE isAssignmentRoot AND courseRootId IS NOT NULL AND isDeletedOn IS NULL
  GROUP BY courseRootId

  UNION ALL SELECT 'attempts_per_student_assignment', COUNT(*)
  FROM contentState x JOIN content c ON c.id = x.contentId AND c.isDeletedOn IS NULL
  GROUP BY x.contentId, x.userId

  UNION ALL SELECT 'item_attempts_per_student_assignment', COUNT(*)
  FROM contentItemState x JOIN content c ON c.id = x.contentId AND c.isDeletedOn IS NULL
  GROUP BY x.contentId, x.userId

  UNION ALL SELECT 'responses_per_student_assignment', COUNT(*)
  FROM submittedResponses x JOIN content c ON c.id = x.contentId AND c.isDeletedOn IS NULL
  GROUP BY x.contentId, x.userId

  UNION ALL SELECT 'folder_depth', depth FROM tree

  UNION ALL SELECT 'children_per_folder', COUNT(*)
  FROM content c JOIN content p ON p.id = c.parentId
  WHERE p.type = 'folder' AND c.isDeletedOn IS NULL AND p.isDeletedOn IS NULL
  GROUP BY c.parentId

  UNION ALL SELECT 'items_per_problem_set', COUNT(*)
  FROM content c JOIN content p ON p.id = c.parentId
  WHERE p.type IN ('sequence', 'select') AND c.isDeletedOn IS NULL AND p.isDeletedOn IS NULL
  GROUP BY c.parentId

  UNION ALL SELECT 'root_items_per_owner', COUNT(*)
  FROM content WHERE parentId IS NULL AND isDeletedOn IS NULL GROUP BY ownerId

  UNION ALL SELECT 'content_per_owner', COUNT(*)
  FROM content WHERE isDeletedOn IS NULL GROUP BY ownerId

  UNION ALL SELECT 'docs_per_owner', COUNT(*)
  FROM content WHERE type = 'singleDoc' AND isDeletedOn IS NULL GROUP BY ownerId

  UNION ALL SELECT 'doc_source_bytes', LENGTH(source)
  FROM content WHERE type = 'singleDoc' AND isDeletedOn IS NULL AND source IS NOT NULL

  UNION ALL SELECT 'revisions_per_content', COUNT(*)
  FROM contentRevisions x JOIN content c ON c.id = x.contentId AND c.isDeletedOn IS NULL
  GROUP BY x.contentId

  UNION ALL SELECT 'remixes_per_origin', COUNT(*)
  FROM contributorHistory x
  JOIN content c ON c.id = x.originContentId AND c.isDeletedOn IS NULL
  JOIN content r ON r.id = x.remixContentId AND r.isDeletedOn IS NULL
  GROUP BY x.originContentId

  UNION ALL SELECT 'classifications_per_content', COUNT(*)
  FROM contentClassifications x JOIN content c ON c.id = x.contentId AND c.isDeletedOn IS NULL
  GROUP BY x.contentId

  UNION ALL SELECT 'categories_per_content', COUNT(*)
  FROM _categoriesTocontent x JOIN content c ON c.id = x.B AND c.isDeletedOn IS NULL
  GROUP BY x.B

  UNION ALL SELECT 'users_per_shared_content', COUNT(*)
  FROM contentShares x JOIN content c ON c.id = x.contentId AND c.isDeletedOn IS NULL
  WHERE x.isRootShare GROUP BY x.contentId

  UNION ALL SELECT 'recent_items_per_user', COUNT(*)
  FROM recentContent x JOIN content c ON c.id = x.contentId AND c.isDeletedOn IS NULL
  GROUP BY x.userId
),
ranked AS (
  SELECT metric, v,
    ROW_NUMBER() OVER (PARTITION BY metric ORDER BY v) AS rn,
    COUNT(*) OVER (PARTITION BY metric) AS n
  FROM samples
)
SELECT
  metric,
  MAX(n) AS `groups`,
  SUM(v) AS total,
  MAX(CASE WHEN rn = CEIL(0.50 * n) THEN v END) AS p50,
  MAX(CASE WHEN rn = CEIL(0.95 * n) THEN v END) AS p95,
  MAX(CASE WHEN rn = CEIL(0.99 * n) THEN v END) AS p99,
  MAX(v) AS max
FROM ranked
GROUP BY metric
ORDER BY metric;

-- ============================================================
-- 3. Table sizes (approximate; from InnoDB statistics)
-- ============================================================

-- information_schema caches table statistics for up to a day by default; read
-- them fresh. This is a session setting, not a write.
SET SESSION information_schema_stats_expiry = 0;

SELECT
  table_name,
  table_rows AS approx_rows,
  ROUND(data_length / 1048576) AS data_mb,
  ROUND(index_length / 1048576) AS index_mb,
  avg_row_length AS avg_row_bytes
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY data_length + index_length DESC;
