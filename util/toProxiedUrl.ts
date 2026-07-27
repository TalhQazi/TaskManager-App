import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://task.se7eninc.com"; // change if needed

let cachedToken: string | null = null;

// preload token once
export const initToken = async () => {
  cachedToken = await AsyncStorage.getItem("auth_token");
};

// safe sync getter
export function getToken() {
  return cachedToken;
}

export function toProxiedUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // allow base64 or already proxied
  if (url.startsWith("data:") || url.includes("/api/s3-proxy/")) return url;

  const s3Match = url.match(/https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
  if (!s3Match) return url;

  const s3Key = s3Match[1];

  const token = cachedToken;
  return `${API_BASE_URL}/api/s3-proxy/${s3Key}${token ? `?token=${token}` : ""}`;
}


export function toProxiedUrlUpload(url: string | null | undefined): string | undefined {
  if (!url) return undefined;


  if (url.startsWith("data:")) return url;

  const token = cachedToken;


  if (url.includes("/uploads/")) {
    const s3Key = url.split("/uploads/")[1]; // Extracts "avatars/1784030917857-u06xy86.jpeg"
    return `${API_BASE_URL}/api/s3-proxy/${s3Key}${token ? `?token=${token}` : ""}`;
  }

  if (url.includes("/api/s3-proxy/")) {
    if (url.includes("token=")) return url; // Already has token, return intact
    return `${url}${token ? `${url.includes("?") ? "&" : "?"}token=${token}` : ""}`;
  }

  const s3Match = url.match(/https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
  if (s3Match) {
    const s3Key = s3Match[1];
    return `${API_BASE_URL}/api/s3-proxy/${s3Key}${token ? `?token=${token}` : ""}`;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  console.log('proxy',url);

  return url;
}