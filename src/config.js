/**
 * Zaïm Kebab — the settings to edit.
 * Dishes: src/menu-data.js. Interface sentences: src/content.js.
 * Both are re-exported here. The rest of the site imports this file only.
 *
 * Colors are repeated as variables in styles.css so the first paint matches
 * before JavaScript runs. tests/order.test.js fails if the two copies drift.
 */

import { copy } from "./content.js";
import { categories, menuItems, replaceMenuItems, dishProblems, findMenuProblems } from "./menu-data.js";

export { copy, categories, menuItems, replaceMenuItems, dishProblems, findMenuProblems };

/** Native names stay in each language's own script. Codes are the closed button. */
export const languageChoices = [
  { id: "fr", code: "FR", name: "Français" },
  { id: "ar", code: "AR", name: "العربية" },
  { id: "en", code: "EN", name: "English" },
];

export const site = {
  name: "Zaïm Kebab",
  /** Set true only after the owner confirms names, prices, and photos. */
  menuConfirmed: false,
  /** Digits only, country code included. Example: "212600000000". */
  whatsappNumber: "212766660845",
  /** Landline from Google, digits only, country code included. */
  phoneNumber: "212520668222",
  /** Final published origin, used when printing table QR codes. */
  publicBaseUrl: "",
  currency: "MAD",
  supportedLanguages: ["fr", "ar", "en"],
  defaultLanguage: "fr",
  maxTableNumber: 999,
  /** https link to the restaurant on Google Maps. Leave "" until it is known. */
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=ZAIM+KEBAB+Bd+Ba+Hmad+Casablanca",
  /** Opens turn-by-turn directions. */
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=ZAIM+KEBAB+Bd+Ba+Hmad+Casablanca",
  /** Embedded map. Leave "" to hide the frame. */
  mapEmbedUrl: "https://maps.google.com/maps?q=ZAIM+KEBAB+Bd+Ba+Hmad+Casablanca&z=16&output=embed",
  facebookUrl: "https://www.facebook.com/profile.php?id=61575905244611",
  instagramUrl: "https://www.instagram.com/zaim_kebab/",
  /** Public store pages. Leave "" until the real link is known. */
  yassirUrl: "https://delivery.yassir.com/fr/restaurants/6908b65db5f98c403eed98ca/Zaim-Kebab",
  glovoUrl: "https://glovoapp.com/en",
  address: {
    fr: "Bd Ba Hmad, Casablanca 20250",
    ar: "Bd Ba Hmad، الدار البيضاء 20250",
    en: "Bd Ba Hmad, Casablanca 20250",
  },
  /** Short facts from the restaurant's Google listing. */
  services: [
    { fr: "Happy hour", ar: "ساعة سعيدة", en: "Happy hour" },
    { fr: "Salle à manger privée", ar: "قاعة طعام خاصة", en: "Private dining room" },
    { fr: "Plats végétaliens", ar: "أطباق نباتية", en: "Vegan dishes" },
  ],
  /**
   * Real opening hours. Leave the list empty until the owner confirms them.
   * Each row: { days: { fr, ar, en }, open: "11:00", close: "23:00" }.
   */
  hours: [
    {
      allDay: true,
      days: { fr: "Tous les jours", ar: "كل يوم", en: "Every day" },
    },
  ],
  media: {
    heroPosterUrl: "./assets/hero/kebab-hero.jpg",
    /** "photo" hides the waiting caption. This file is a temporary stand-in. */
    heroPosterKind: "photo",
    /** Local file only. Empty skips video and keeps the still photo. */
    heroVideoUrl: "./assets/hero/intro-web.mp4",
  },
  theme: {
    "--green": "#4cae49",
    "--green-dark": "#2f8a32",
    "--ink": "#1a1819",
    "--paper": "#f6f3ec",
    "--card": "#fffcf7",
    "--chili": "#d24a2e",
    "--muted": "#5c605c",
    "--line": "#e5e0d4",
    "--soft": "#e7f5e4",
    "--font-display": '"Fraunces", "Noto Sans Arabic", Georgia, serif',
    "--font-body": '"Outfit", "Noto Sans Arabic", "Segoe UI", sans-serif',
  },
};

export function parseTableNumber(value, max = site.maxTableNumber) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const table = Number(normalized);
  return Number.isSafeInteger(table) && table >= 1 && table <= max ? table : null;
}

export function switchLanguage(state, language, supportedLanguages = site.supportedLanguages) {
  if (!supportedLanguages.includes(language)) return false;
  state.language = language;
  return true;
}

export function shouldLoadHeroVideo({ smallViewport, saveData, effectiveType }) {
  if (smallViewport || saveData) return false;
  return !["slow-2g", "2g"].includes(effectiveType);
}

/** Video is opt-in and must be a local file, so a phone never downloads someone else's footage. */
export function canUseHeroVideo(url, conditions) {
  const value = String(url ?? "").trim();
  if (!value.startsWith("./") || value.includes("..") || value.includes("\\") || value.includes("://")) return false;
  return shouldLoadHeroVideo(conditions);
}

export function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeAssetUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.includes("\\") || raw.includes("..")) return false;
  if (raw.startsWith("./") || (raw.startsWith("/") && !raw.startsWith("//"))) return true;
  return isSafeHttpUrl(raw);
}

export function findSiteProblems() {
  const problems = [...findMenuProblems()];
  if (site.whatsappNumber && !/^\d+$/.test(site.whatsappNumber)) problems.push("WhatsApp number must be digits only.");
  if (site.phoneNumber && !/^\d+$/.test(site.phoneNumber)) problems.push("Phone number must be digits only.");
  for (const [name, value] of [
    ["Maps", site.mapsUrl],
    ["Directions", site.directionsUrl],
    ["Map embed", site.mapEmbedUrl],
    ["Facebook", site.facebookUrl],
    ["Instagram", site.instagramUrl],
    ["Yassir", site.yassirUrl],
    ["Glovo", site.glovoUrl],
  ]) {
    if (value && !isSafeHttpUrl(value)) problems.push(`${name} link must be an https address.`);
  }
  if (site.media.heroVideoUrl && !String(site.media.heroVideoUrl).startsWith("./")) problems.push("Hero video must be a local file.");
  if (!["placeholder", "photo"].includes(site.media.heroPosterKind)) problems.push("Hero poster kind is invalid.");
  for (const language of site.supportedLanguages) {
    if (!site.address?.[language]?.trim()) problems.push(`Address is missing ${language}.`);
    if (!copy[language]) problems.push(`Missing ${language} copy.`);
  }
  const keySets = site.supportedLanguages.map((language) => Object.keys(copy[language] ?? {}).sort().join("|"));
  if (new Set(keySets).size !== 1) problems.push("Translations are missing keys.");
  if (languageChoices.map((choice) => choice.id).join("|") !== site.supportedLanguages.join("|")) {
    problems.push("Language choices must follow supportedLanguages.");
  }
  for (const choice of languageChoices) {
    if (!choice.code?.trim() || !choice.name?.trim()) problems.push(`Language ${choice.id} needs a code and a native name.`);
  }
  for (const service of site.services ?? []) {
    for (const language of site.supportedLanguages) {
      if (!service[language]?.trim()) problems.push(`A service is missing ${language}.`);
    }
  }
  for (const row of site.hours ?? []) {
    if (!row.allDay && (!/^\d{2}:\d{2}$/.test(row.open ?? "") || !/^\d{2}:\d{2}$/.test(row.close ?? ""))) {
      problems.push("Hours need 24-hour open and close times.");
    }
    for (const language of site.supportedLanguages) {
      if (!row.days?.[language]?.trim()) problems.push(`An hours row is missing ${language}.`);
    }
  }
  return problems;
}

export function createTableUrl(baseUrl, tableNumber) {
  const table = parseTableNumber(tableNumber);
  const base = String(baseUrl ?? "").trim();
  if (!table || !base) return null;
  try {
    const url = new URL(base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/menu`;
    url.search = new URLSearchParams({ table: String(table) }).toString();
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
