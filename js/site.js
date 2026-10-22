import { todayIso } from "./schedule.js";
import { renderPage } from "./render.js";

const SOURCES = [
  ["site", "./data/site.json"],
  ["events", "./data/events.json"],
  ["performances", "./data/performances.json"],
  ["history", "./data/history.json"],
  ["achievements", "./data/achievements.json"],
  ["gallery", "./data/gallery.json"],
];

export async function loadJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`${path} を読み込めませんでした (${response.status})`);
  }
  return response.json();
}

export async function loadContent() {
  const entries = await Promise.all(SOURCES.map(async ([key, path]) => {
    try {
      const data = await loadJson(path);
      return [key, { ok: true, data }];
    } catch (error) {
      console.error(error);
      return [key, { ok: false }];
    }
  }));
  return Object.fromEntries(entries);
}

export async function mount(doc = document, now = new Date()) {
  const content = await loadContent();
  renderPage(doc, content, todayIso(now));
}

mount();
