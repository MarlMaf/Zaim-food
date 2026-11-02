/**
 * Example menu for Zaïm Kebab. Replace every name, description, and price
 * with the owner's, then set site.menuConfirmed to true in src/config.js.
 * Swap each image.src for a real photo and set image.kind to "photo".
 */

import catalog from "../data/menu.json" with { type: "json" };

function isSafeAssetUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.includes("\\") || raw.includes("..")) return false;
  if (raw.startsWith("./") || (raw.startsWith("/") && !raw.startsWith("//"))) return true;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

export const categories = catalog.categories;
export let menuItems = catalog.menuItems;

export function replaceMenuItems(items) {
  menuItems = items;
}

export function dishProblems(item, categoryList = categories, languages = ["fr", "ar", "en"]) {
  const problems = [];
  if (!item?.id?.trim()) problems.push("A dish is missing an id.");
  if (!categoryList.some((category) => category.id === item?.category && category.id !== "all")) {
    problems.push(`${item?.id ?? "dish"} uses an unknown category.`);
  }
  if (!Number.isFinite(item?.price) || item.price < 0) problems.push(`${item?.id ?? "dish"} needs a price of zero or more.`);
  if (!isSafeAssetUrl(item?.image?.src)) problems.push(`${item?.id ?? "dish"} has an unsafe image address.`);
  if (!["placeholder", "photo"].includes(item?.image?.kind)) problems.push(`${item?.id ?? "dish"} needs an image kind of placeholder or photo.`);
  for (const language of languages) {
    if (!item?.name?.[language]?.trim()) problems.push(`${item?.id ?? "dish"} is missing a ${language} name.`);
    if (!item?.description?.[language]?.trim()) problems.push(`${item?.id ?? "dish"} is missing a ${language} description.`);
    if (!item?.image?.alt?.[language]?.trim()) problems.push(`${item?.id ?? "dish"} is missing ${language} alt text.`);
  }
  for (const extra of item?.extras ?? []) {
    if (!extra.id?.trim()) problems.push(`${item.id} has an extra without an id.`);
    if (!Number.isFinite(extra.price) || extra.price < 0) problems.push(`${item.id} has an extra with a bad price.`);
    for (const language of languages) {
      if (!extra.name?.[language]?.trim()) problems.push(`${item.id} extra is missing a ${language} name.`);
    }
  }
  return problems;
}

export function findMenuProblems(items = menuItems, categoryList = categories, languages = ["fr", "ar", "en"]) {
  const problems = [];
  const ids = new Set();
  const highlights = items.filter((item) => item.highlight);
  const popular = items.filter((item) => item.popular);
  if (highlights.length !== 1) problems.push("The menu needs exactly one highlighted combo.");
  if (popular.length < 2 || popular.length > 3) problems.push("The menu needs 2 or 3 popular dishes.");

  for (const category of categoryList) {
    for (const language of languages) {
      if (!category.label?.[language]?.trim()) problems.push(`Category ${category.id} is missing a ${language} label.`);
    }
    if (category.id !== "all" && !items.some((item) => item.category === category.id)) {
      problems.push(`Category ${category.id} has no dishes.`);
    }
  }

  for (const item of items) {
    if (item?.id && ids.has(item.id)) problems.push(`Dish id "${item.id}" is duplicated.`);
    if (item?.id) ids.add(item.id);
    problems.push(...dishProblems(item, categoryList, languages));
  }

  return problems;
}
