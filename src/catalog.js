import { categories, menuItems } from "./menu-data.js";

export const catalogStorageKey = "zaim-food-owner-products-v1";

const demoImageByCategory = {
  burgers: "./assets/menu/demo-burger.svg",
  sandwiches: "./assets/menu/demo-sandwich.svg",
  tacos: "./assets/menu/demo-tacos.svg",
  sides: "./assets/menu/demo-bites.svg",
  drinks: "./assets/menu/demo-drink.svg",
};

function imageAlt(name, kind) {
  const prefix = kind === "demo"
    ? { fr: "Illustration de démonstration :", ar: "رسم توضيحي تجريبي:", en: "Demo illustration:" }
    : { fr: "Photo du plat :", ar: "صورة الطبق:", en: "Dish photo:" };
  return Object.fromEntries(["fr", "ar", "en"].map((language) => [
    language,
    `${prefix[language]} ${name[language]}`,
  ]));
}

export function readOwnerProducts(storage = globalThis.sessionStorage) {
  const saved = storage.getItem(catalogStorageKey);
  if (saved === null) return [];

  let products;
  try {
    products = JSON.parse(saved);
  } catch (error) {
    throw new Error("Saved owner menu data is not valid JSON.", { cause: error });
  }
  if (!Array.isArray(products) || !products.every(isOwnerProduct)) {
    throw new Error("Saved owner menu data has an invalid product format.");
  }
  return products;
}

export function loadMenuCatalog(storage = globalThis.sessionStorage) {
  return [...menuItems, ...readOwnerProducts(storage)];
}

export function isOwnerProduct(product) {
  return Boolean(product)
    && typeof product.id === "string"
    && /^owner-[a-zA-Z0-9-]+$/u.test(product.id)
    && typeof product.category === "string"
    && categories.some((category) => category.id === product.category)
    && ["fr", "ar", "en"].every((language) => (
      typeof product.name?.[language] === "string"
      && typeof product.description?.[language] === "string"
    ))
    && Number.isFinite(product.price)
    && product.price >= 0
    && Array.isArray(product.extras)
    && product.extras.every((extra) => (
      typeof extra.id === "string"
      && /^extra-\d+$/u.test(extra.id)
      && ["fr", "ar", "en"].every((language) => typeof extra.name?.[language] === "string")
      && Number.isFinite(extra.price)
      && extra.price >= 0
    ))
    && (product.image === null || (
      typeof product.image?.src === "string"
      && normalizeImageUrl(product.image.src) === product.image.src
      && ["fr", "ar", "en"].every((language) => typeof product.image.alt?.[language] === "string")
      && ["demo", "owner"].includes(product.image.kind)
    ));
}

export function normalizeImageUrl(value) {
  const source = String(value ?? "").trim();
  if (!source) return null;
  try {
    const url = new URL(source, "https://zaim-local.invalid");
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.origin === "https://zaim-local.invalid" && !source.startsWith("/") && !source.startsWith("./") && !source.startsWith("../")) {
      return null;
    }
    return source;
  } catch {
    return null;
  }
}

export function createOwnerProduct({
  name, description, category, price, imageUrl = "", extras = "",
  id = `owner-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
}) {
  if (!categories.some((entry) => entry.id === category)) {
    throw new Error("Choose a valid menu category.");
  }
  for (const language of ["fr", "ar", "en"]) {
    if (!String(name?.[language] ?? "").trim()) throw new Error("Enter the product name in French, Arabic, and English.");
    if (!String(description?.[language] ?? "").trim()) throw new Error("Enter the product description in French, Arabic, and English.");
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 100000) {
    throw new Error("Enter a price between 0 and 100000 MAD.");
  }

  const normalizedImage = normalizeImageUrl(imageUrl);
  if (String(imageUrl).trim() && !normalizedImage) {
    throw new Error("Use an HTTPS, HTTP, or relative image URL.");
  }

  const cleanName = Object.fromEntries(["fr", "ar", "en"].map((language) => [
    language,
    String(name[language]).trim(),
  ]));
  const cleanDescription = Object.fromEntries(["fr", "ar", "en"].map((language) => [
    language,
    String(description[language]).trim(),
  ]));
  const parsedExtras = typeof extras === "string"
    ? extras.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [fr, ar, en, extraPrice, ...unexpected] = line.split("|").map((part) => part.trim());
      if (unexpected.length || !fr || !ar || !en || !extraPrice) {
        throw new Error("Write each extra as French name | Arabic name | English name | price.");
      }
      return { name: { fr, ar, en }, price: extraPrice };
    })
    : extras;
  const cleanExtras = parsedExtras.map((extra, index) => {
    const extraPrice = Number(extra.price);
    if (["fr", "ar", "en"].some((language) => !String(extra.name?.[language] ?? "").trim())) {
      throw new Error("Enter each extra name in French, Arabic, and English.");
    }
    if (!Number.isFinite(extraPrice) || extraPrice < 0 || extraPrice > 100000) {
      throw new Error("Enter a valid price for every extra.");
    }
    return {
      id: `extra-${index + 1}`,
      name: Object.fromEntries(["fr", "ar", "en"].map((language) => [
        language,
        String(extra.name[language]).trim(),
      ])),
      price: extraPrice,
    };
  });
  const kind = normalizedImage ? "owner" : "demo";

  return {
    id,
    category,
    name: cleanName,
    description: cleanDescription,
    price: numericPrice,
    extras: cleanExtras,
    image: {
      src: normalizedImage ?? demoImageByCategory[category],
      kind,
      alt: imageAlt(cleanName, kind),
    },
  };
}

export function addOwnerProduct(product, storage = globalThis.sessionStorage) {
  if (!isOwnerProduct(product)) throw new Error("Cannot save an invalid menu product.");
  const products = readOwnerProducts(storage);
  if (products.some((entry) => entry.id === product.id) || menuItems.some((entry) => entry.id === product.id)) {
    throw new Error("A product with this ID already exists.");
  }
  storage.setItem(catalogStorageKey, JSON.stringify([...products, product]));
}

export function removeOwnerProduct(id, storage = globalThis.sessionStorage) {
  const products = readOwnerProducts(storage);
  storage.setItem(catalogStorageKey, JSON.stringify(products.filter((product) => product.id !== id)));
}
