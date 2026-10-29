export const restaurantConfig = {
  name: "Zaim Food",
  whatsappNumber: "",
  publicBaseUrl: "",
  currency: "MAD",
  supportedLanguages: ["fr", "ar", "en"],
  defaultLanguage: "fr",
  maxTableNumber: 999,
};

export function parseTableNumber(value, max = restaurantConfig.maxTableNumber) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) return null;

  const table = Number(normalized);
  return Number.isSafeInteger(table) && table >= 1 && table <= max ? table : null;
}

export function switchLanguage(state, language, supportedLanguages = restaurantConfig.supportedLanguages) {
  if (!supportedLanguages.includes(language)) return false;
  state.language = language;
  return true;
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
