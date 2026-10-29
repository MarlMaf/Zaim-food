import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createTableUrl, parseTableNumber, restaurantConfig, shouldLoadHeroVideo, switchLanguage,
} from "../src/config.js";
import { menuItems } from "../src/menu-data.js";
import {
  addOwnerProduct, catalogStorageKey, createOwnerProduct, loadMenuCatalog, normalizeImageUrl,
  readOwnerProducts, removeOwnerProduct,
} from "../src/catalog.js";
import { buildOrderMessage, createWhatsAppUrl, getCartTotals, getItemUnitPrice } from "../src/order.js";

test("table numbers accept positive integers up to the configured limit", () => {
  assert.equal(parseTableNumber("5"), 5);
  assert.equal(parseTableNumber(" 005 "), 5);
  for (const invalid of ["", null, "0", "-1", "1.5", "1e2", "1000", "abc"]) {
    assert.equal(parseTableNumber(invalid), null, `expected ${String(invalid)} to be rejected`);
  }
});

test("a missing or invalid table is never used to generate a table URL", () => {
  assert.equal(createTableUrl("", 5), null);
  assert.equal(createTableUrl("not a url", 5), null);
  assert.equal(createTableUrl("javascript:alert(1)", 5), null);
  assert.equal(createTableUrl("https://restaurant.example", 0), null);
  assert.equal(createTableUrl("https://restaurant.example/", 5), "https://restaurant.example/menu?table=5");
  assert.equal(createTableUrl("https://restaurant.example/zaim", 12), "https://restaurant.example/zaim/menu?table=12");
});

test("switching language preserves the active table and cart", () => {
  const session = {
    language: "fr",
    tableNumber: 7,
    cart: [{ itemId: "classic-burger", extraIds: ["cheese"], quantity: 2 }],
  };
  assert.equal(switchLanguage(session, "ar"), true);
  assert.equal(session.language, "ar");
  assert.equal(session.tableNumber, 7);
  assert.deepEqual(session.cart, [{ itemId: "classic-burger", extraIds: ["cheese"], quantity: 2 }]);
  assert.equal(switchLanguage(session, "de"), false);
  assert.equal(session.language, "ar");
});

test("cart totals include selected extras and quantities", () => {
  const cart = [
    { itemId: "classic-burger", extraIds: ["cheese", "sauce", "cheese"], quantity: 2 },
    { itemId: "golden-fries", extraIds: ["sauce"], quantity: 1 },
  ];
  assert.equal(getItemUnitPrice(menuItems[0], ["cheese", "sauce", "cheese"]), 70);
  assert.deepEqual(getCartTotals(cart, menuItems), {
    lines: [
      { item: menuItems[0], quantity: 2, unitPrice: 70, lineTotal: 140, extraIds: ["cheese", "sauce", "cheese"] },
      { item: menuItems[6], quantity: 1, unitPrice: 24, lineTotal: 24, extraIds: ["sauce"] },
    ],
    subtotal: 164,
    total: 164,
  });
  assert.equal(getCartTotals([{ itemId: "removed-item", quantity: 4 }], menuItems).total, 0);
});

test("order message includes itemization, extras, table and optional fields", () => {
  const message = buildOrderMessage({
    restaurantName: restaurantConfig.name,
    tableNumber: 5,
    cart: [{ itemId: "classic-burger", extraIds: ["cheese"], quantity: 2 }],
    items: menuItems,
    customerName: "Sam",
    note: "Merci & شكراً",
    language: "fr",
  });
  assert.match(message, /Zaim Food/);
  assert.match(message, /Table: 5/);
  assert.match(message, /2 × Le Classique/);
  assert.match(message, /Fromage en plus/);
  assert.match(message, /66 MAD l’unité — 132 MAD/);
  assert.match(message, /Sous-total: 132 MAD/);
  assert.match(message, /Total: 132 MAD/);
  assert.match(message, /Nom: Sam/);
  assert.match(message, /Note: Merci & شكراً/);
});

test("WhatsApp links use digits-only numbers and correctly encode French and Arabic text", () => {
  const number = "123";
  const message = "Zaim Food — Table 5\nطلب: برغر & thé 100% ?";
  const link = createWhatsAppUrl(number, message);
  assert.equal(link, `https://wa.me/${number}?text=${encodeURIComponent(message)}`);
  assert.equal(new URL(link).searchParams.get("text"), message);
  assert.equal(createWhatsAppUrl("", message), null);
  assert.equal(createWhatsAppUrl("+212 600 000 000", message), null);
});

test("every demo dish has an existing image and localized descriptive alt text", () => {
  for (const item of menuItems) {
    assert.ok(item.image?.src, `${item.id} needs an image path`);
    assert.equal(item.image.kind, "demo", `${item.id} placeholder must be marked as demo imagery`);
    assert.ok(existsSync(resolve(item.image.src)), `${item.id} image file should exist`);
    for (const language of restaurantConfig.supportedLanguages) {
      assert.match(item.image.alt[language], /.+/u, `${item.id} needs ${language} alt text`);
    }
    assert.match(readFileSync(resolve(item.image.src), "utf8"), /<svg\b/u);
  }
});

test("hero media has a local poster fallback and credited replaceable footage", () => {
  assert.ok(existsSync(resolve(restaurantConfig.media.heroPosterUrl)));
  assert.match(readFileSync(resolve(restaurantConfig.media.heroPosterUrl), "utf8"), /<svg\b/u);
  assert.match(restaurantConfig.media.heroVideoUrl, /\.webm#t=0,18$/u);
  assert.match(restaurantConfig.media.videoCreditUrl, /commons\.wikimedia\.org/u);
});

test("hero video is skipped for reduced motion, small screens, and constrained data", () => {
  const fullNetwork = { reduceMotion: false, smallViewport: false, saveData: false, effectiveType: "4g" };
  assert.equal(shouldLoadHeroVideo(fullNetwork), true);
  assert.equal(shouldLoadHeroVideo({ ...fullNetwork, reduceMotion: true }), false);
  assert.equal(shouldLoadHeroVideo({ ...fullNetwork, smallViewport: true }), false);
  assert.equal(shouldLoadHeroVideo({ ...fullNetwork, saveData: true }), false);
  assert.equal(shouldLoadHeroVideo({ ...fullNetwork, effectiveType: "3g" }), false);
});

test("owner catalog stays in session storage and flows into the menu", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  };
  const product = createOwnerProduct({
    id: "owner-test-pizza",
    category: "burgers",
    price: "74",
    name: { fr: "Burger maison", ar: "برغر الدار", en: "House burger" },
    description: { fr: "Description FR", ar: "وصف عربي", en: "English description" },
    extras: "Fromage | جبن | Cheese | 8\nSauce | صلصة | Sauce | 4",
  });
  addOwnerProduct(product, storage);
  assert.deepEqual(readOwnerProducts(storage), [product]);
  assert.equal(loadMenuCatalog(storage).length, menuItems.length + 1);
  assert.deepEqual(loadMenuCatalog(storage).at(-1).extras.map((extra) => extra.price), [8, 4]);
  assert.equal(getCartTotals([{ itemId: product.id, extraIds: ["extra-1"], quantity: 2 }], loadMenuCatalog(storage)).total, 164);
  removeOwnerProduct(product.id, storage);
  assert.deepEqual(readOwnerProducts(storage), []);
  assert.equal(data.has(catalogStorageKey), true);
});

test("owner products reject missing translations, invalid categories, and unsafe image schemes", () => {
  const values = {
    id: "owner-safe-test",
    category: "burgers",
    price: "40",
    name: { fr: "Nom", ar: "اسم", en: "Name" },
    description: { fr: "Texte", ar: "نص", en: "Text" },
  };
  assert.throws(() => createOwnerProduct({ ...values, category: "unknown" }), /category/u);
  assert.throws(() => createOwnerProduct({ ...values, name: { ...values.name, ar: "" } }), /name in French/u);
  assert.throws(() => createOwnerProduct({ ...values, imageUrl: "javascript:alert(1)" }), /image URL/u);
  assert.throws(() => createOwnerProduct({ ...values, extras: "Fromage | جبن | Cheese | " }), /extra as/u);
  assert.equal(normalizeImageUrl("./assets/menu/item.webp"), "./assets/menu/item.webp");
  assert.equal(normalizeImageUrl("https://images.example/item.webp"), "https://images.example/item.webp");
  assert.equal(normalizeImageUrl("data:image/svg+xml,test"), null);
});

test("owner product data reports malformed stored session JSON", () => {
  const storage = { getItem: () => "{broken", setItem: () => {} };
  assert.throws(() => readOwnerProducts(storage), /valid JSON/u);
});
