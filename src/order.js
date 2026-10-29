export function getItemUnitPrice(item, extraIds = []) {
  const extraTotal = [...new Set(extraIds)]
    .map((id) => item.extras.find((extra) => extra.id === id)?.price ?? 0)
    .reduce((sum, price) => sum + price, 0);
  return item.price + extraTotal;
}

export function getCartTotals(cart, items) {
  const lines = cart.map((entry) => {
    const item = items.find((candidate) => candidate.id === entry.itemId);
    if (!item) return null;
    const quantity = Math.max(1, Math.floor(Number(entry.quantity) || 1));
    const unitPrice = getItemUnitPrice(item, entry.extraIds);
    return { item, quantity, unitPrice, lineTotal: unitPrice * quantity, extraIds: entry.extraIds };
  }).filter(Boolean);

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines, subtotal, total: subtotal };
}

export function buildOrderMessage({
  restaurantName, tableNumber, cart, items, customerName = "", note = "", language = "fr", currency = "MAD",
}) {
  const { lines, subtotal, total } = getCartTotals(cart, items);
  const labels = {
    fr: { table: "Table", order: "Commande", subtotal: "Sous-total", total: "Total", name: "Nom", note: "Note", each: "l’unité" },
    ar: { table: "الطاولة", order: "الطلب", subtotal: "المجموع الفرعي", total: "الإجمالي", name: "الاسم", note: "ملاحظة", each: "للوحدة" },
    en: { table: "Table", order: "Order", subtotal: "Subtotal", total: "Total", name: "Name", note: "Note", each: "each" },
  }[language] ?? { table: "Table", order: "Order", subtotal: "Subtotal", total: "Total", name: "Name", note: "Note", each: "each" };
  const money = (amount) => `${amount} ${currency}`;
  const lineText = lines.map(({ item, quantity, unitPrice, lineTotal, extraIds }) => {
    const extras = [...new Set(extraIds)]
      .map((id) => item.extras.find((extra) => extra.id === id))
      .filter(Boolean)
      .map((extra) => `${extra.name[language] ?? extra.name.en} (+${money(extra.price)})`);
    const detail = extras.length ? `\n   ${extras.join(", ")}` : "";
    return `- ${quantity} × ${item.name[language] ?? item.name.en}${detail}\n   ${money(unitPrice)} ${labels.each} — ${money(lineTotal)}`;
  });
  const linesOfText = [
    `${restaurantName} — ${labels.order}`,
    `${labels.table}: ${tableNumber}`,
    "",
    ...lineText,
    "",
    `${labels.subtotal}: ${money(subtotal)}`,
    `${labels.total}: ${money(total)}`,
  ];

  if (customerName.trim()) linesOfText.push(`${labels.name}: ${customerName.trim()}`);
  if (note.trim()) linesOfText.push(`${labels.note}: ${note.trim()}`);
  return linesOfText.join("\n");
}

export function createWhatsAppUrl(number, message) {
  const normalizedNumber = String(number ?? "").trim();
  if (!/^\d+$/.test(normalizedNumber)) return null;
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
