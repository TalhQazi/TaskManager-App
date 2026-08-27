import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL = "https://task.se7eninc.com";

let cachedToken: string | null = null;

// preload token once
export const initToken = async (): Promise<string | null> => {
  try {
    const rawAuth = await AsyncStorage.getItem("employee_auth");
    let empToken = "";
    if (rawAuth) {
      try {
        const parsed = JSON.parse(rawAuth);
        empToken = parsed.token || "";
      } catch {}
    }

    cachedToken =
      (await AsyncStorage.getItem("auth_token")) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("jwt")) ||
      empToken ||
      null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
};

// Immediately invoke initToken on module load
initToken().catch(() => {});

// Immediate sync token setter
export function setCachedToken(token: string | null) {
  cachedToken = token;
}

// safe sync getter
export function getToken(): string | null {
  return cachedToken;
}

/**
 * Bulletproof proxy URL builder for all S3 and backend uploaded media
 */
export function toProxiedUrl(
  url: string | null | undefined,
  tokenOverride?: string | null
): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  let raw = url.trim();
  if (!raw) return undefined;

  // Local device assets or raw base64 data URIs
  if (
    raw.startsWith("data:") ||
    raw.startsWith("file://") ||
    raw.startsWith("content://")
  ) {
    return raw;
  }

  // Normalize legacy development hosts (e.g. http://192.168.x.x:5002 or http://localhost:5002)
  raw = raw.replace(/^https?:\/\/(192\.168\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?/i, "");

  const token = tokenOverride || cachedToken;

  // If already contains token parameter
  if (raw.includes("token=")) {
    return raw.startsWith("/") ? `${API_BASE_URL}${raw}` : raw;
  }

  // 1. Handles URLs containing /uploads/ or uploads/
  if (raw.includes("/uploads/")) {
    const s3Key = raw.split("/uploads/")[1]?.split("?")[0];
    if (s3Key) {
      return `${API_BASE_URL}/api/s3-proxy/${s3Key}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    }
  }
  if (raw.startsWith("uploads/")) {
    const s3Key = raw.replace(/^uploads\//, "").split("?")[0];
    return `${API_BASE_URL}/api/s3-proxy/${s3Key}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }

  // 2. Handles /s3-proxy/ and /api/s3-proxy/ URLs
  if (raw.includes("/s3-proxy/")) {
    const s3Key = raw.split("/s3-proxy/")[1]?.split("?")[0];
    if (s3Key) {
      return `${API_BASE_URL}/api/s3-proxy/${s3Key}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    }
  }

  // 3. Handles direct S3 bucket URLs (e.g. *.s3.amazonaws.com or *.s3-*.amazonaws.com)
  const s3Match =
    raw.match(/https?:\/\/[^/]+\.s3[.-][^/]+\.amazonaws\.com\/(.+)/i) ||
    raw.match(/https?:\/\/s3[.-][^/]+\.amazonaws\.com\/[^/]+\/(.+)/i);
  if (s3Match) {
    let s3Key = s3Match[1].split("?")[0];
    if (s3Key.startsWith("uploads/")) {
      s3Key = s3Key.replace(/^uploads\//, "");
    }
    return `${API_BASE_URL}/api/s3-proxy/${s3Key}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }

  // 4. Handles relative root paths (e.g. /static/...)
  if (raw.startsWith("/")) {
    return `${API_BASE_URL}${raw}${token ? `${raw.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : ""}`;
  }

  // 5. Handles other external http(s) URLs (e.g. Unsplash, Google, external CDNs)
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    // If it points to task.se7eninc.com and needs token
    if (raw.includes("task.se7eninc.com") && token && !raw.includes("token=")) {
      return `${raw}${raw.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    }
    return raw;
  }

  // Fallback relative filename
  return `${API_BASE_URL}/api/s3-proxy/${raw}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export const toProxiedUrlUpload = toProxiedUrl;
export default toProxiedUrl;