import { DateTime } from "luxon";

export function formatTime(time: string) {
  let timeFormatted: string;

  const sameDay = (a: DateTime, b: DateTime): boolean => {
    return a.hasSame(b, "day") && a.hasSame(b, "month") && a.hasSame(b, "year");
  };

  const timeLuxon = DateTime.fromISO(time);
  const now = DateTime.now();
  const tomorrow = now.plus({ day: 1 });

  if (sameDay(timeLuxon, now)) {
    if (timeLuxon.minute === 0) {
      timeFormatted = `today, ${timeLuxon.toLocaleString({ hour: "2-digit" })}`;
    } else {
      timeFormatted = `today, ${timeLuxon.toLocaleString({ hour: "2-digit", minute: "2-digit" })}`;
    }
  } else if (sameDay(timeLuxon, tomorrow)) {
    if (timeLuxon.minute === 0) {
      timeFormatted = `tomorrow, ${timeLuxon.toLocaleString({ hour: "2-digit" })}`;
    } else {
      timeFormatted = `tomorrow, ${timeLuxon.toLocaleString({ hour: "2-digit", minute: "2-digit" })}`;
    }
  } else if (timeLuxon.year === now.year) {
    if (timeLuxon.minute === 0) {
      timeFormatted = timeLuxon.toLocaleString({
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
      });
    } else {
      timeFormatted = timeLuxon.toLocaleString({
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } else {
    timeFormatted = timeLuxon.toLocaleString(DateTime.DATETIME_MED);
  }

  return timeFormatted;
}
