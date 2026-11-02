import { copy, languageChoices, site, isSafeHttpUrl } from "./config.js";
import { buildOrderMessage, createWhatsAppUrl } from "./order.js";

const languageStorageKey = "zaim-kebab-language";

export function text(language, key) {
  const value = copy[language]?.[key] ?? copy[site.defaultLanguage]?.[key];
  return typeof value === "string" ? value : "";
}

export function readLanguage(search = "") {
  const requested = new URLSearchParams(search).get("lang");
  if (site.supportedLanguages.includes(requested)) return requested;
  try {
    const saved = sessionStorage.getItem(languageStorageKey);
    if (site.supportedLanguages.includes(saved)) return saved;
  } catch {
    /* Private browsing can block storage. The default language still works. */
  }
  return site.defaultLanguage;
}

export function rememberLanguage(language) {
  try {
    sessionStorage.setItem(languageStorageKey, language);
  } catch {
    /* The choice still applies to this page. */
  }
}

export function applyDocumentLanguage(language) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
}

export function fillI18n(language) {
  for (const node of document.querySelectorAll("[data-i18n]")) {
    const value = text(language, node.dataset.i18n);
    if (node.dataset.i18nAttr) node.setAttribute(node.dataset.i18nAttr, value);
    else node.textContent = value;
  }
}

export function paintLanguageMenu(language) {
  const current = languageChoices.find((choice) => choice.id === language) ?? languageChoices[0];
  const toggle = document.querySelector("#language-toggle");
  const label = document.querySelector("#language-current");
  if (label) label.textContent = current.code;
  if (toggle) toggle.setAttribute("aria-label", text(language, "language"));
  for (const button of document.querySelectorAll("#language-menu [data-language]")) {
    const selected = button.dataset.language === language;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  }
}

function mountLanguageMenu(menu) {
  menu.replaceChildren(...languageChoices.map((choice) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    button.dataset.language = choice.id;
    button.lang = choice.id;
    button.textContent = choice.name;
    item.append(button);
    return item;
  }));
}

export function bindLanguageMenu(onChange) {
  const root = document.querySelector("#language-switch");
  const toggle = document.querySelector("#language-toggle");
  const menu = document.querySelector("#language-menu");
  if (!root || !toggle || !menu) return;
  mountLanguageMenu(menu);

  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(menu.hidden);
  });
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-language]");
    if (!button) return;
    event.stopPropagation();
    onChange(button.dataset.language);
    setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

function placeLink(node, href, fallback, label, pending) {
  if (!node) return;
  const ready = Boolean(href);
  node.textContent = label;
  node.href = ready ? href : fallback;
  node.classList.toggle("is-pending", !ready);
  if (ready) node.removeAttribute("title");
  else node.title = pending;
}

export function renderFooter(language) {
  const home = document.body.dataset.page === "menu";
  const visit = home ? "#visit" : "/#visit";
  const note = document.querySelector("#footer-note");
  const year = document.querySelector("#footer-year");
  if (note) note.hidden = false;
  if (note) note.textContent = site.menuConfirmed ? text(language, "footerReady") : text(language, "footerNote");
  if (year) year.textContent = `\u2066© ${new Date().getFullYear()} ${site.name}\u2069`;
  const whatsapp = createWhatsAppUrl(site.whatsappNumber, buildOrderMessage({
    restaurantName: site.name,
    cart: [],
    items: [],
    language,
    currency: site.currency,
  }));
  const pending = text(language, "linkPending");
  placeLink(document.querySelector("#footer-whatsapp"), whatsapp, visit, text(language, "whatsappCta"), pending);
  placeLink(
    document.querySelector("#footer-maps"),
    isSafeHttpUrl(site.mapsUrl) ? site.mapsUrl : "",
    visit,
    text(language, "mapsCta"),
    pending,
  );
  placeLink(
    document.querySelector("#footer-yassir"),
    isSafeHttpUrl(site.yassirUrl) ? site.yassirUrl : "",
    visit,
    text(language, "yassirCta"),
    pending,
  );
  placeLink(
    document.querySelector("#footer-glovo"),
    isSafeHttpUrl(site.glovoUrl) ? site.glovoUrl : "",
    visit,
    text(language, "glovoCta"),
    pending,
  );
}
