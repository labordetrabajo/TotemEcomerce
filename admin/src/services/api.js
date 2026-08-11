export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data
        ? data.error || data.message || "La operación no pudo completarse"
        : data || "La operación no pudo completarse";

    throw new Error(message);
  }

  return data;
}

export function getAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
