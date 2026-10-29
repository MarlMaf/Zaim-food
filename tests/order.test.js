import test from "node:test";
import assert from "node:assert/strict";
import { createTableUrl, parseTableNumber, restaurantConfig, switchLanguage } from "../src/config.js";
import { menuItems } from "../src/menu-data.js";
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
