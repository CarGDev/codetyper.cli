/**
 * Clipboard Service - Reads images from system clipboard
 *
 * Platform-specific clipboard reading:
 * - macOS: Uses pbpaste and osascript for images
 * - Linux: Uses xclip or wl-paste
 * - Windows: Uses PowerShell
 */

import { tmpdir } from "os";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import type { ImageMediaType, PastedImage } from "@/types/image";
import { runCommand } from "@services/clipboard/run-command";

/** Supported image formats for clipboard operations */
export const SUPPORTED_IMAGE_FORMATS: ImageMediaType[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const detectPlatform = (): "darwin" | "linux" | "win32" | "unsupported" => {
  const platform = process.platform;
  if (platform === "darwin" || platform === "linux" || platform === "win32") {
    return platform;
  }
  return "unsupported";
};

const detectImageType = (buffer: Buffer): ImageMediaType | null => {
  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    if (
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return "image/webp";
    }
  }
  return null;
};

const readClipboardImageMacOS = async (): Promise<PastedImage | null> => {
  const tempFile = join(tmpdir(), `clipboard-${uuidv4()}.png`);

  try {
    // Use osascript to save clipboard image to temp file
    const script = `
      set theFile to POSIX file "${tempFile}"
      try
        set imageData to the clipboard as «class PNGf»
        set fileRef to open for access theFile with write permission
        write imageData to fileRef
        close access fileRef
        return "success"
      on error
        return "no image"
      end try
    `;

    const { stdout } = await runCommand("osascript", ["-e", script]);
    const result = stdout.toString().trim();

    if (result !== "success") {
      return null;
    }

    // Read the temp file
    const imageBuffer = await readFile(tempFile);
    const mediaType = detectImageType(imageBuffer);

    if (!mediaType) {
      return null;
    }

    const base64Data = imageBuffer.toString("base64");

    return {
      id: uuidv4(),
      mediaType,
      data: base64Data,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  } finally {
    // Cleanup temp file
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
};

const readClipboardImageLinux = async (): Promise<PastedImage | null> => {
  // Try xclip first, then wl-paste for Wayland
  const commands = [
    {
      cmd: "xclip",
      args: ["-selection", "clipboard", "-t", "image/png", "-o"],
    },
    { cmd: "wl-paste", args: ["--type", "image/png"] },
  ];

  for (const { cmd, args } of commands) {
    try {
      const { stdout } = await runCommand(cmd, args);

      if (stdout.length === 0) {
        continue;
      }

      const mediaType = detectImageType(stdout);
      if (!mediaType) {
        continue;
      }

      return {
        id: uuidv4(),
        mediaType,
        data: stdout.toString("base64"),
        timestamp: Date.now(),
      };
    } catch {
      // Try next command
      continue;
    }
  }

  return null;
};

const readClipboardImageWindows = async (): Promise<PastedImage | null> => {
  const tempFile = join(tmpdir(), `clipboard-${uuidv4()}.png`);

  try {
    // PowerShell script to save clipboard image
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $image = [System.Windows.Forms.Clipboard]::GetImage()
      if ($image -ne $null) {
        $image.Save('${tempFile.replace(/\\/g, "\\\\")}', [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output "success"
      } else {
        Write-Output "no image"
      }
    `;

    const { stdout } = await runCommand("powershell", ["-Command", script]);
    const result = stdout.toString().trim();

    if (result !== "success") {
      return null;
    }

    const imageBuffer = await readFile(tempFile);
    const mediaType = detectImageType(imageBuffer);

    if (!mediaType) {
      return null;
    }

    return {
      id: uuidv4(),
      mediaType,
      data: imageBuffer.toString("base64"),
      timestamp: Date.now(),
    };
  } catch {
    return null;
  } finally {
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
};

export const readClipboardImage = async (): Promise<PastedImage | null> => {
  const platform = detectPlatform();

  const platformHandlers: Record<string, () => Promise<PastedImage | null>> = {
    darwin: readClipboardImageMacOS,
    linux: readClipboardImageLinux,
    win32: readClipboardImageWindows,
    unsupported: async () => null,
  };

  const handler = platformHandlers[platform];
  return handler();
};

export const hasClipboardImage = async (): Promise<boolean> => {
  const image = await readClipboardImage();
  return image !== null;
};

export const formatImageSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const getImageSizeFromBase64 = (base64: string): number => {
  // Base64 encoding increases size by ~33%
  return Math.ceil((base64.length * 3) / 4);
};
