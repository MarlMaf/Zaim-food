export const restaurantConfig = {
  name: "Zaim Food",
  whatsappNumber: "",
  publicBaseUrl: "",
  currency: "MAD",
  supportedLanguages: ["fr", "ar", "en"],
  defaultLanguage: "fr",
  maxTableNumber: 999,
  media: {
    heroVideoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ed/Abadir_Nomadic_Berber_PIzza.webm#t=0,18",
    heroPosterUrl: "./assets/hero/pizza-prep-demo.svg",
    videoCreditUrl: "https://commons.wikimedia.org/wiki/File:Abadir_Nomadic_Berber_PIzza.webm",
  },
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

export function shouldLoadHeroVideo({ reduceMotion, smallViewport, saveData, effectiveType }) {
  return !reduceMotion && !smallViewport && !saveData && !["slow-2g", "2g", "3g"].includes(effectiveType);
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
