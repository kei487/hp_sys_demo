import { formatDateJa, safeEmail, safeHttpUrl, selectSchedule } from "./schedule.js";

export const EMPTY_SCHEDULE_MESSAGE = "現在、公開中の出演予定はありません";
export const LOAD_ERROR_MESSAGE = "情報を読み込めませんでした";

function textOf(record, key) {
  const value = record?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function clear(node) {
  node.replaceChildren();
}

function element(doc, tag, className, value) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = value;
  return node;
}

function showError(doc, node) {
  clear(node);
  node.appendChild(element(doc, "p", "load-error", LOAD_ERROR_MESSAGE));
}

function appendImage(doc, parent, url, alt, className) {
  const safe = safeHttpUrl(url);
  if (!safe) return;
  const img = doc.createElement("img");
  img.src = safe;
  img.alt = alt || "写真";
  img.className = className;
  img.addEventListener("error", () => {
    img.remove();
  });
  parent.appendChild(img);
}

function appendExternalLink(doc, parent, url, label, className) {
  const safe = safeHttpUrl(url);
  if (!safe) return null;
  const link = element(doc, "a", className, label);
  link.href = safe;
  if (/^https?:/i.test(safe)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  parent.appendChild(link);
  return link;
}

function eventDetail(event) {
  const time = textOf(event, "time");
  const place = textOf(event, "place");
  if (time && place) return `${time} ｜ ${place}`;
  return time || place;
}

function isCanceled(event) {
  return String(event.status ?? "").trim() === "canceled";
}

function appendBadge(doc, parent) {
  parent.appendChild(element(doc, "span", "badge", "中止"));
}

function renderNext(doc, container, next) {
  clear(container);
  if (!next) {
    container.appendChild(element(doc, "p", "empty-message", EMPTY_SCHEDULE_MESSAGE));
    return;
  }
  container.appendChild(element(doc, "p", "next-date", formatDateJa(next.date)));
  const title = textOf(next, "title");
  if (title) {
    const titleNode = element(doc, "p", "next-title", title);
    if (isCanceled(next)) appendBadge(doc, titleNode);
    container.appendChild(titleNode);
  }
  const detail = eventDetail(next);
  if (detail) container.appendChild(element(doc, "p", "next-detail", detail));
  const note = textOf(next, "note");
  if (note) container.appendChild(element(doc, "p", "next-note multiline", note));
  const actions = element(doc, "div", "next-actions");
  const scheduleLink = element(doc, "a", "btn", "スケジュール一覧を見る");
  scheduleLink.href = "#schedule";
  actions.appendChild(scheduleLink);
  appendExternalLink(doc, actions, textOf(next, "event_url"), "イベントのページを見る", "btn btn-secondary");
  container.appendChild(actions);
}

function renderTable(doc, upcoming, next) {
  const table = element(doc, "table", "event-table");
  const thead = doc.createElement("thead");
  const headRow = doc.createElement("tr");
  ["日付", "時間", "場所", "内容", "備考"].forEach((label) => {
    headRow.appendChild(element(doc, "th", null, label));
  });
  thead.appendChild(headRow);
  const tbody = doc.createElement("tbody");
  upcoming.forEach((event) => {
    const row = doc.createElement("tr");
    if (event === next) row.classList.add("next");
    if (isCanceled(event)) row.classList.add("canceled");
    row.appendChild(element(doc, "td", null, formatDateJa(event.date)));
    row.appendChild(element(doc, "td", null, textOf(event, "time") || "—"));
    row.appendChild(element(doc, "td", null, textOf(event, "place") || "—"));
    const content = doc.createElement("td");
    content.appendChild(doc.createTextNode(textOf(event, "title") || "—"));
    if (isCanceled(event)) appendBadge(doc, content);
    const link = appendExternalLink(doc, content, textOf(event, "event_url"), "詳細", "event-link");
    if (link) {
      link.before(doc.createElement("br"));
    }
    row.appendChild(content);
    row.appendChild(element(doc, "td", "multiline", textOf(event, "note") || "—"));
    tbody.appendChild(row);
  });
  table.append(thead, tbody);
  return table;
}

function renderCards(doc, upcoming, next) {
  const list = element(doc, "ul", "event-cards");
  upcoming.forEach((event) => {
    const card = doc.createElement("li");
    card.className = "event-card";
    if (event === next) card.classList.add("next");
    if (isCanceled(event)) card.classList.add("canceled");
    const date = element(doc, "p", "event-card-date", formatDateJa(event.date));
    if (isCanceled(event)) appendBadge(doc, date);
    const title = textOf(event, "title");
    card.appendChild(date);
    if (title) card.appendChild(element(doc, "p", "event-card-title", title));
    const facts = doc.createElement("dl");
    [
      ["時間", textOf(event, "time")],
      ["場所", textOf(event, "place")],
      ["備考", textOf(event, "note")],
    ].forEach(([label, value]) => {
      if (!value) return;
      const wrap = doc.createElement("div");
      wrap.appendChild(element(doc, "dt", null, label));
      wrap.appendChild(element(doc, "dd", label === "備考" ? "multiline" : null, value));
      facts.appendChild(wrap);
    });
    if (facts.childElementCount) card.appendChild(facts);
    appendExternalLink(doc, card, textOf(event, "event_url"), "詳細", "event-link");
    list.appendChild(card);
  });
  return list;
}

function renderEvents(doc, result, today) {
  const nextBox = doc.getElementById("next-event");
  const list = doc.getElementById("event-list");
  if (!result?.ok || !Array.isArray(result.data)) {
    showError(doc, nextBox);
    showError(doc, list);
    return;
  }
  const { upcoming, next } = selectSchedule(result.data, today);
  renderNext(doc, nextBox, next);
  clear(list);
  if (upcoming.length === 0) {
    list.appendChild(element(doc, "p", "empty-message", EMPTY_SCHEDULE_MESSAGE));
    return;
  }
  list.append(renderTable(doc, upcoming, next), renderCards(doc, upcoming, next));
}

function renderSite(doc, result, today) {
  const nameEl = doc.getElementById("stage-name");
  const taglineEl = doc.getElementById("site-tagline");
  const top = doc.getElementById("top-content");
  const profile = doc.getElementById("profile-content");
  const contact = doc.getElementById("contact-box");
  const footer = doc.getElementById("footer-content");
  if (!result?.ok || !result.data || typeof result.data !== "object" || Array.isArray(result.data)) {
    nameEl.textContent = LOAD_ERROR_MESSAGE;
    taglineEl.textContent = "";
    showError(doc, top);
    showError(doc, profile);
    showError(doc, contact);
    showError(doc, footer);
    return;
  }

  const site = result.data;
  const stageName = textOf(site, "stage_name");
  nameEl.textContent = stageName;
  taglineEl.textContent = textOf(site, "tagline");
  if (stageName) doc.title = `${stageName} | 大道芸人`;

  clear(top);
  const catchphrase = textOf(site, "catchphrase");
  const introduction = textOf(site, "introduction");
  if (catchphrase) top.appendChild(element(doc, "p", "lead multiline", catchphrase));
  if (introduction) top.appendChild(element(doc, "p", "text multiline", introduction));
  appendImage(doc, top, textOf(site, "hero_image"), stageName ? `${stageName}の画像` : "トップ画像", "hero-image");

  clear(profile);
  appendImage(doc, profile, textOf(site, "profile_image"), stageName ? `${stageName}のプロフィール写真` : "プロフィール写真", "profile-photo");
  const rows = [
    ["芸名", stageName],
    ["ジャンル", textOf(site, "genre")],
    ["活動エリア", textOf(site, "area")],
    ["出演時間", textOf(site, "duration")],
  ].filter(([, value]) => value);
  if (rows.length) {
    const dl = element(doc, "dl", "profile");
    rows.forEach(([label, value]) => {
      dl.appendChild(element(doc, "dt", null, label));
      dl.appendChild(element(doc, "dd", null, value));
    });
    profile.appendChild(dl);
  }
  const biography = textOf(site, "biography");
  if (biography) profile.appendChild(element(doc, "p", "text biography multiline", biography));

  const message = textOf(site, "contact_message");
  const email = safeEmail(textOf(site, "contact_email"));
  clear(contact);
  if (message) contact.appendChild(element(doc, "p", "text multiline", message));
  if (email) {
    const line = element(doc, "p");
    const link = element(doc, "a", "email", email);
    link.href = `mailto:${email}`;
    line.appendChild(link);
    contact.appendChild(line);
  }
  [
    [textOf(site, "instagram_url"), "Instagram"],
    [textOf(site, "inquiry_url"), "お問い合わせフォーム"],
  ].forEach(([url, label]) => {
    if (!safeHttpUrl(url)) return;
    const line = element(doc, "p");
    appendExternalLink(doc, line, url, label, null);
    contact.appendChild(line);
  });
  if (!contact.childElementCount) {
    contact.appendChild(element(doc, "p", "empty-message", "問い合わせ先はまだ設定されていません"));
  }

  clear(footer);
  if (email) {
    const line = element(doc, "p");
    line.appendChild(doc.createTextNode("出演依頼・お問い合わせ: "));
    const link = element(doc, "a", null, email);
    link.href = `mailto:${email}`;
    line.appendChild(link);
    footer.appendChild(line);
  }
  const year = today.slice(0, 4);
  const copy = stageName
    ? `© ${year} ${stageName}. All rights reserved.`
    : `© ${year} All rights reserved.`;
  footer.appendChild(element(doc, "p", null, copy));
}

function renderPerformances(doc, result) {
  const mount = doc.getElementById("performance-mount");
  if (!result?.ok || !Array.isArray(result.data)) {
    showError(doc, mount);
    return;
  }
  const items = result.data.filter((item) => item && (textOf(item, "title") || textOf(item, "description") || safeHttpUrl(textOf(item, "image"))));
  clear(mount);
  if (!items.length) {
    mount.appendChild(element(doc, "p", "empty-message", "パフォーマンス内容はまだ登録されていません"));
    return;
  }
  const list = element(doc, "ul", "cards");
  items.forEach((item) => {
    const card = doc.createElement("li");
    const title = textOf(item, "title");
    appendImage(doc, card, textOf(item, "image"), title || "パフォーマンスの写真", null);
    if (title) card.appendChild(element(doc, "h3", null, title));
    const description = textOf(item, "description");
    if (description) card.appendChild(element(doc, "p", "multiline", description));
    list.appendChild(card);
  });
  mount.appendChild(list);
}

function renderHistory(doc, result) {
  const mount = doc.getElementById("history-mount");
  if (!result?.ok || !Array.isArray(result.data)) {
    showError(doc, mount);
    return;
  }
  const items = result.data.filter((item) => item && (textOf(item, "period") || textOf(item, "description")));
  clear(mount);
  if (!items.length) {
    mount.appendChild(element(doc, "p", "empty-message", "経歴はまだ登録されていません"));
    return;
  }
  const list = element(doc, "ul", "history");
  items.forEach((item) => {
    const row = doc.createElement("li");
    const period = textOf(item, "period");
    if (period) row.appendChild(element(doc, "span", "year", period));
    row.appendChild(element(doc, "span", "desc multiline", textOf(item, "description")));
    list.appendChild(row);
  });
  mount.appendChild(list);
}

function renderAchievements(doc, result) {
  const mount = doc.getElementById("achievements-mount");
  if (!result?.ok || !Array.isArray(result.data)) {
    showError(doc, mount);
    return;
  }
  const items = result.data.filter((item) => item && textOf(item, "description"));
  clear(mount);
  if (!items.length) {
    mount.appendChild(element(doc, "p", "empty-message", "出演実績はまだ登録されていません"));
    return;
  }
  const list = element(doc, "ul", "achievements");
  items.forEach((item) => {
    list.appendChild(element(doc, "li", null, textOf(item, "description")));
  });
  mount.appendChild(list);
}

function renderGallery(doc, result) {
  const section = doc.getElementById("gallery");
  const mount = doc.getElementById("gallery-mount");
  if (!result?.ok || !Array.isArray(result.data)) {
    section.hidden = false;
    showError(doc, mount);
    return;
  }
  const items = result.data.filter((item) => item && (safeHttpUrl(textOf(item, "image")) || textOf(item, "caption")));
  clear(mount);
  if (!items.length) {
    section.hidden = true;
    return;
  }
  const list = element(doc, "ul", "gallery");
  items.forEach((item) => {
    const figure = doc.createElement("figure");
    const caption = textOf(item, "caption");
    const alt = textOf(item, "alt_text") || caption || "写真";
    appendImage(doc, figure, textOf(item, "image"), alt, null);
    if (caption) figure.appendChild(element(doc, "figcaption", "multiline", caption));
    if (!figure.childElementCount) return;
    const card = doc.createElement("li");
    card.appendChild(figure);
    list.appendChild(card);
  });
  if (!list.childElementCount) {
    section.hidden = true;
    return;
  }
  mount.appendChild(list);
  section.hidden = false;
}

export function renderPage(doc, content, today) {
  renderSite(doc, content.site, today);
  renderEvents(doc, content.events, today);
  renderPerformances(doc, content.performances);
  renderHistory(doc, content.history);
  renderAchievements(doc, content.achievements);
  renderGallery(doc, content.gallery);
}
