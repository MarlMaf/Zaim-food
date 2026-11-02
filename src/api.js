import { apiBaseUrl } from "./deploy-config.js";

const baseUrl = String(apiBaseUrl ?? "").trim().replace(/\/+$/, "");

export function apiUrl(path, configuredBaseUrl = baseUrl) {
  if (!path.startsWith("/api/")) throw new TypeError("API paths must start with /api/.");
  const origin = String(configuredBaseUrl ?? "").trim().replace(/\/+$/, "");
  return `${origin}${path}`;
}