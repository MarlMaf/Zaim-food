const labels = {
  fr: {
    table: "Table", order: "Commande", subtotal: "Sous-total", total: "Total",
    name: "Nom", note: "Note", each: "l'unité",
    greeting: "Bonjour, je souhaite commander.",
  },
  ar: {
    table: "الطاولة", order: "الطلب", subtotal: "المجموع الفرعي", total: "الإجمالي",
    name: "الاسم", note: "ملاحظة", each: "للوحدة",
    greeting: "مرحبا، أريد أن أطلب.",
  },
  en: {
    table: "Table", order: "Order", subtotal: "Subtotal", total: "Total",
    name: "Name", note: "Note", each: "each",
    greeting: "Hello, I would like to order.",
  },
};

export function getItemUnitPrice(item, extraIds = []) {
  const extras = item.extras ?? [];
  const extraTotal = [...new Set(extraIds)]
    .map((id) => extras.find((extra) => extra.id === id)?.price ?? 0)
    .reduce((sum, price) => sum + price, 0);
  return item.price + extraTotal;
}

export function getCartTotals(cart, items) {
  const lines = cart.map((entry) => {
    const item = items.find((candidate) => candidate.id === entry.itemId);
    if (!item) return null;
    const quantity = Math.max(1, Math.floor(Number(entry.quantity) || 1));
    const extraIds = entry.extraIds ?? [];
    const unitPrice = getItemUnitPrice(item, extraIds);
    return { item, quantity, unitPrice, lineTotal: unitPrice * quantity, extraIds };
  }).filter(Boolean);

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines, subtotal, total: subtotal };
}

export function buildOrderMessage({
  restaurantName, tableNumber = null, cart = [], items = [], customerName = "", note = "", language = "fr", currency = "MAD",
}) {
  const text = labels[language] ?? labels.en;
  const { lines, subtotal, total } = getCartTotals(cart, items);
  const money = (amount) => `${amount} ${currency}`;
  const parts = [`${restaurantName} — ${text.order}`];
  if (tableNumber) parts.push(`${text.table}: ${tableNumber}`);
  parts.push("");

  if (!lines.length) {
    parts.push(text.greeting);
  } else {
    for (const { item, quantity, unitPrice, lineTotal, extraIds } of lines) {
      const extras = [...new Set(extraIds)]
        .map((id) => (item.extras ?? []).find((extra) => extra.id === id))
        .filter(Boolean)
        .map((extra) => `${extra.name[language] ?? extra.name.en} (+${money(extra.price)})`);
      const detail = extras.length ? `\n   ${extras.join(", ")}` : "";
      const dishName = item.name[language] ?? item.name.en;
      parts.push(`- ${quantity} × ${dishName}${detail}\n   ${money(unitPrice)} ${text.each} — ${money(lineTotal)}`);
    }
    parts.push("", `${text.subtotal}: ${money(subtotal)}`, `${text.total}: ${money(total)}`);
  }

  if (customerName.trim()) parts.push(`${text.name}: ${customerName.trim()}`);
  if (note.trim()) parts.push(`${text.note}: ${note.trim()}`);
  return parts.join("\n");
}

export function createWhatsAppUrl(number, message) {
  const normalizedNumber = String(number ?? "").trim();
  if (!/^\d+$/.test(normalizedNumber)) return null;
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
