import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canUseHeroVideo, copy, createTableUrl, findSiteProblems, isSafeAssetUrl, isSafeHttpUrl,
  menuItems, parseTableNumber, shouldLoadHeroVideo, site, switchLanguage,
} from "../src/config.js";
import { buildOrderMessage, createWhatsAppUrl, getCartTotals, getItemUnitPrice } from "../src/order.js";
import { apiUrl, hasBackend } from "../src/api.js";

const readyNetwork = { reduceMotion: false, smallViewport: false, saveData: false, effectiveType: "4g" };

test("table numbers accept positive integers up to the configured limit", () => {
  assert.equal(parseTableNumber("5"), 5);
  assert.equal(parseTableNumber(" 005 "), 5);
  for (const invalid of ["", null, "0", "-1", "1.5", "1e2", "1000", "abc"]) {
    assert.equal(parseTableNumber(invalid), null);
  }
});

test("table links stay on the menu path and reject unsafe bases", () => {
  assert.equal(createTableUrl("", 5), null);
  assert.equal(createTableUrl("javascript:alert(1)", 5), null);
  assert.equal(createTableUrl("https://zaim.example", 0), null);
  assert.equal(createTableUrl("https://zaim.example/", 5), "https://zaim.example/menu?table=5");
  assert.equal(createTableUrl("https://zaim.example/kebab", 12), "https://zaim.example/kebab/menu?table=12");
});

test("the API helper keeps local requests same-origin and rejects non-API paths", () => {
  assert.equal(hasBackend, false);
  assert.equal(apiUrl("/api/menu"), "/api/menu");
  assert.equal(apiUrl("/api/menu", "https://zaim-food-api.onrender.com/"), "https://zaim-food-api.onrender.com/api/menu");
  assert.throws(() => apiUrl("/admin.html"), TypeError);
});

test("switching language keeps the table and the cart", () => {
  const session = { language: "fr", tableNumber: 7, cart: [{ itemId: "kebab-mixte", extraIds: [], quantity: 2 }] };
  assert.equal(switchLanguage(session, "ar"), true);
  assert.equal(session.language, "ar");
  assert.equal(session.tableNumber, 7);
  assert.equal(switchLanguage(session, "de"), false);
  assert.equal(session.language, "ar");
});

test("the site config is complete and the menu has no gaps", () => {
  assert.equal(site.name, "Zaïm Kebab");
  assert.deepEqual(findSiteProblems(), []);
  for (const id of ["kebabs", "tacos", "sandwiches", "menus", "drinks"]) {
    assert.ok(menuItems.some((item) => item.category === id), id);
  }
});

test("colors in the stylesheet match the site config", () => {
  const css = readFileSync(resolve("styles.css"), "utf8");
  const rootStart = css.indexOf(":root");
  const root = css.slice(rootStart, css.indexOf("}", rootStart));
  for (const [name, value] of Object.entries(site.theme)) {
    assert.ok(root.includes(`${name}: ${value};`), `${name} should be ${value}`);
  }
});

test("the first screen uses the French sentences from the content file", () => {
  const html = readFileSync(resolve("index.html"), "utf8");
  for (const key of ["heroLine", "menuCta", "whatsappCta", "heroAlt", "locationLine"]) {
    assert.ok(html.includes(copy.fr[key]), key);
  }
  assert.equal(html.includes("wikimedia"), false);
  assert.equal(html.includes("admin.html"), false);
  assert.equal(existsSync(resolve("404.html")), true);
  assert.ok(html.includes('serviceWorker.register("./sw.js")'));
  const worker = readFileSync(resolve("sw.js"), "utf8");
  assert.ok(worker.includes('mode !== "navigate"'));
  assert.ok(worker.includes('new URL("./404.html", self.registration.scope)'));
  assert.equal(existsSync(resolve("admin.html")), true);
  assert.ok(readFileSync(resolve("admin.html"), "utf8").includes('id="admin-login"'));
});

test("cart totals include extras once and skip unknown dishes", () => {
  const fixture = {
    id: "extra-fixture",
    price: 30,
    name: { fr: "Test", ar: "اختبار", en: "Test" },
    extras: [{ id: "fromage", price: 5, name: { fr: "Fromage", ar: "جبن", en: "Cheese" } }],
  };
  assert.equal(getItemUnitPrice(fixture, ["fromage", "fromage"]), 35);
  const totals = getCartTotals([
    { itemId: "kebab-mixte", extraIds: [], quantity: 2 },
    { itemId: "soda", extraIds: [], quantity: 1 },
    { itemId: "missing", extraIds: [], quantity: 4 },
  ], menuItems);
  assert.equal(totals.total, 100);
});

test("a WhatsApp message names the dish and includes a table only when one was scanned", () => {
  const shared = {
    restaurantName: site.name,
    cart: [{ itemId: "kebab-classique", extraIds: [], quantity: 2 }],
    items: menuItems,
    customerName: "Sam",
    note: "Sans oignons",
    language: "fr",
  };
  const withTable = buildOrderMessage({ ...shared, tableNumber: 5 });
  assert.match(withTable, /Zaïm Kebab/);
  assert.match(withTable, /Table: 5/);
  assert.match(withTable, /2 × Kebab classique/);
  assert.match(withTable, /35 MAD l'unité — 70 MAD/);
  assert.match(withTable, /Total: 70 MAD/);
  assert.match(withTable, /Nom: Sam/);
  const walkIn = buildOrderMessage({ ...shared, tableNumber: null });
  assert.equal(walkIn.includes("Table:"), false);
  const hello = buildOrderMessage({ restaurantName: site.name, cart: [], items: menuItems, language: "ar" });
  assert.match(hello, /أريد أن أطلب/);
  assert.equal(hello.includes("الإجمالي"), false);
});

test("WhatsApp links accept digits only and keep Arabic text intact", () => {
  const message = "Zaïm Kebab — طلب: كباب & thé 100% ?";
  const link = createWhatsAppUrl("212600000000", message);
  assert.equal(link, `https://wa.me/212600000000?text=${encodeURIComponent(message)}`);
  assert.equal(new URL(link).searchParams.get("text"), message);
  assert.equal(createWhatsAppUrl("", message), null);
  assert.equal(createWhatsAppUrl("+212 600", message), null);
});

test("every dish image is a local file with text for each language", () => {
  for (const item of menuItems) {
    assert.equal(existsSync(resolve(item.image.src)), true, item.id);
    assert.match(item.image.src, /\.(?:svg|jpe?g|png|webp)$/u);
    assert.ok(readFileSync(resolve(item.image.src)).length > 1000, item.id);
    for (const language of site.supportedLanguages) {
      assert.match(item.image.alt[language], /\S/u);
    }
  }
  assert.equal(existsSync(resolve(site.media.heroPosterUrl)), true);
  assert.equal(site.media.heroVideoUrl, "./assets/hero/intro-web.mp4");
  assert.ok(readFileSync(resolve(site.media.heroVideoUrl)).length > 1000);
});

test("the hero video stays local and skips constrained phones", () => {
  assert.equal(canUseHeroVideo("./assets/hero/intro.webm", readyNetwork), true);
  assert.equal(canUseHeroVideo("", readyNetwork), false);
  assert.equal(canUseHeroVideo("../secret.webm", readyNetwork), false);
  assert.equal(canUseHeroVideo("https://upload.wikimedia.org/video.webm", readyNetwork), false);
  assert.equal(shouldLoadHeroVideo(readyNetwork), true);
  assert.equal(shouldLoadHeroVideo({ ...readyNetwork, reduceMotion: true }), true);
  assert.equal(shouldLoadHeroVideo({ ...readyNetwork, smallViewport: true }), false);
  assert.equal(shouldLoadHeroVideo({ ...readyNetwork, saveData: true }), false);
  assert.equal(shouldLoadHeroVideo({ ...readyNetwork, effectiveType: "3g" }), true);
  assert.equal(shouldLoadHeroVideo({ ...readyNetwork, effectiveType: "2g" }), false);
});

test("external links must be https and images cannot use script addresses", () => {
  assert.equal(isSafeHttpUrl("https://maps.example/zaim"), true);
  assert.equal(isSafeHttpUrl("http://maps.example/zaim"), false);
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeAssetUrl("./assets/menu/kebab.svg"), true);
  assert.equal(isSafeAssetUrl("javascript:alert(1)"), false);
  assert.equal(isSafeAssetUrl("https://images.example/kebab.webp"), true);
});
