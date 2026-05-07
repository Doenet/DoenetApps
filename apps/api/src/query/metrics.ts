import { prisma } from "../model";

type Metric = {
  metric: "users_joined" | "content_created" | "content_shared_publicly";
  granularity: "daily" | "weekly" | "monthly";
  // TODO: Once we start providing actual dates rather than yearWeek numbers,
  // we should explicitly define the timezone used for those dates.
  // timezone: string;
  range: {
    start: Date;
    end: Date;
  };
  data: { date: string; count: number }[];
};

/**
 * Get users joined between `start` and `end`, tabulated weekly.
 * Does not include anonymous users.
 */
export async function getWeeklyUsersJoined({
  start = new Date(0),
  end = new Date(),
}: {
  start?: Date;
  end?: Date;
}): Promise<Metric> {
  const result = await prisma.$queryRaw<{ yearWeek: number; count: bigint }[]>`
    SELECT
      YEARWEEK(joinedAt, 0) AS yearWeek,
      COUNT(*) AS count
    FROM users
    WHERE isAnonymous = false
    AND joinedAt BETWEEN ${start} AND ${end}
    GROUP BY yearWeek
    ORDER BY yearWeek;
  `;

  // YEARWEEK returns week number (1-53) and year, stored as YYYYWW format
  // Converting back to actual dates is complex; for now using the yearWeek as date identifier

  return {
    metric: "users_joined",
    granularity: "weekly",
    range: { start, end },
    data: result.map((row) => ({
      date: row.yearWeek.toString(),
      count: Number(row.count),
    })),
  };
}

/**
 * Get content created between `start` and `end`, tabulated weekly.
 * Does not include deleted content or assignments.
 */
export async function getWeeklyContentCreated({
  start = new Date(0),
  end = new Date(),
}: {
  start?: Date;
  end?: Date;
}): Promise<Metric> {
  const result = await prisma.$queryRaw<{ yearWeek: number; count: bigint }[]>`
    SELECT
      YEARWEEK(c.createdAt, 0) AS yearWeek,
      COUNT(*) AS count
    FROM content c
    LEFT JOIN content parent ON c.parentId = parent.id
    WHERE c.isDeletedOn IS NULL
    AND c.isAssignmentRoot = FALSE
    AND (parent.id IS NULL OR parent.isAssignmentRoot = FALSE)
    AND c.createdAt BETWEEN ${start} AND ${end}
    GROUP BY yearWeek
    ORDER BY yearWeek;
  `;
  return {
    metric: "content_created",
    granularity: "weekly",
    range: { start, end },
    data: result.map((row) => ({
      date: row.yearWeek.toString(),
      count: Number(row.count),
    })),
  };
}

/**
 * Get content shared publicly between `start` and `end`, tabulated weekly.
 * Does not include deleted content that was public.
 */
export async function getWeeklyContentSharedPublicly({
  start = new Date(0),
  end = new Date(),
}: {
  start?: Date;
  end?: Date;
}): Promise<Metric> {
  const result = await prisma.$queryRaw<{ yearWeek: number; count: bigint }[]>`
    SELECT
      YEARWEEK(publiclySharedAt, 0) AS yearWeek,
      COUNT(*) AS count
    FROM content
    WHERE isDeletedOn IS NULL
    AND publiclySharedAt BETWEEN ${start} AND ${end}
    GROUP BY yearWeek
    ORDER BY yearWeek;
  `;
  return {
    metric: "content_shared_publicly",
    granularity: "weekly",
    range: { start, end },
    data: result.map((row) => ({
      date: row.yearWeek.toString(),
      count: Number(row.count),
    })),
  };
}
