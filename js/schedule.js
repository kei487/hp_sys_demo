/**
 * 出演日の判定。
 * `new Date("YYYY-MM-DD")` は UTC の深夜として解釈され、日本時間では前日になることがある。
 * 年月日の文字列と、Asia/Tokyo の今日を直接比べる。
 */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function todayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function formatDateJa(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = WEEKDAYS[utc.getUTCDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}

export function safeHttpUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    if (trimmed.includes("\\")) return "";
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

export function safeEmail(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed)) return "";
  return trimmed;
}

function isCanceled(event) {
  return String(event.status ?? "").trim() === "canceled";
}

export function selectSchedule(events, today) {
  if (!isIsoDate(today)) {
    throw new Error("today must be YYYY-MM-DD");
  }
  const source = Array.isArray(events) ? events : [];
  const indexed = [];
  source.forEach((event, index) => {
    if (!event || typeof event !== "object") return;
    if (event.published === false) return;
    if (!isIsoDate(event.date)) return;
    if (event.date < today) return;
    indexed.push({ event, index });
  });
  indexed.sort((left, right) => {
    if (left.event.date < right.event.date) return -1;
    if (left.event.date > right.event.date) return 1;
    return left.index - right.index;
  });
  const upcoming = indexed.map((item) => item.event);
  const next = upcoming.find((event) => !isCanceled(event)) ?? null;
  return { upcoming, next };
}
