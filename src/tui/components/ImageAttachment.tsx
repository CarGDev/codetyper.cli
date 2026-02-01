/**
 * ImageAttachment Component - Displays pasted image indicators
 */

import React from "react";
import { Box, Text } from "ink";
import type { PastedImage } from "@/types/image";
import { formatImageSize, getImageSizeFromBase64 } from "@services/clipboard-service";

interface ImageAttachmentProps {
  images: PastedImage[];
  onRemove?: (id: string) => void;
}

const IMAGE_ICON = "📷";

export function ImageAttachment({
  images,
  onRemove,
}: ImageAttachmentProps): React.ReactElement | null {
  if (images.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="row" gap={1} marginBottom={1}>
      {images.map((image, index) => {
        const size = getImageSizeFromBase64(image.data);
        const formattedSize = formatImageSize(size);

        return (
          <Box
            key={image.id}
            borderStyle="round"
            borderColor="cyan"
            paddingX={1}
          >
            <Text color="cyan">{IMAGE_ICON} </Text>
            <Text>Image {index + 1}</Text>
            <Text dimColor> ({formattedSize})</Text>
            {onRemove && (
              <Text dimColor> [x]</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export function ImageAttachmentCompact({
  images,
}: {
  images: PastedImage[];
}): React.ReactElement | null {
  if (images.length === 0) {
    return null;
  }

  const totalSize = images.reduce(
    (acc, img) => acc + getImageSizeFromBase64(img.data),
    0,
  );

  return (
    <Box>
      <Text color="cyan">{IMAGE_ICON} </Text>
      <Text>
        {images.length} image{images.length > 1 ? "s" : ""} attached
      </Text>
      <Text dimColor> ({formatImageSize(totalSize)})</Text>
    </Box>
  );
}
