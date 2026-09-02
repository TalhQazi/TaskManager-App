import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

export interface TaskAttachmentPayload {
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}

/**
 * Converts a DocumentPickerAsset into a normalized base64 data URI payload
 * suitable for backend upload (S3 / server storage).
 */
export async function convertAssetToBase64(
  asset: DocumentPicker.DocumentPickerAsset
): Promise<TaskAttachmentPayload> {
  const mimeType = asset.mimeType || "application/octet-stream";
  const fileName = asset.name || "attachment";
  const size = asset.size || 0;

  try {
    if (Platform.OS === "web") {
      if (asset.file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(asset.file!);
        });
        return { fileName, url: base64, mimeType, size };
      } else if (asset.uri) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return { fileName, url: base64, mimeType, size };
      }
    } else {
      // Native (iOS / Android)
      const base64Content = await (FileSystem as any).readAsStringAsync(asset.uri, {
        encoding: (FileSystem as any).EncodingType?.Base64 || "base64",
      });
      const url = `data:${mimeType};base64,${base64Content}`;
      return { fileName, url, mimeType, size };
    }
  } catch (err) {
    console.error("[fileUtils] Error converting asset to base64:", err);
  }

  return { fileName, url: asset.uri, mimeType, size };
}

/**
 * Format bytes to readable size (e.g. 1.2 MB, 450 KB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
