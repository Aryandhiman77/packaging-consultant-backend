export function readJpegSize(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 16 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer.at(-2) !== 0xff ||
    buffer.at(-1) !== 0xd9
  ) {
    throw new Error(
      "The cropped banner must be a valid JPG image."
    );
  }

  let pos = 2;

  while (pos + 4 < buffer.length) {
    if (buffer[pos++] !== 0xff) {
      throw new Error("Invalid JPG marker.");
    }

    while (buffer[pos] === 0xff) {
      pos++;
    }

    const marker = buffer[pos++];

    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    if (
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd8)
    ) {
      continue;
    }

    if (pos + 2 > buffer.length) {
      break;
    }

    const size = buffer.readUInt16BE(pos);

    if (
      size < 2 ||
      pos + size > buffer.length
    ) {
      throw new Error("Invalid JPG segment.");
    }

    const startOfFrame = [
      0xc0, 0xc1, 0xc2, 0xc3,
      0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb,
      0xcd, 0xce, 0xcf,
    ];

    if (startOfFrame.includes(marker)) {
      if (size < 7) {
        throw new Error("Invalid JPG dimensions.");
      }

      const height = buffer.readUInt16BE(pos + 3);
      const width = buffer.readUInt16BE(pos + 5);

      if (!width || !height) {
        throw new Error("Invalid JPG dimensions.");
      }

      return { width, height };
    }

    pos += size;
  }

  throw new Error(
    "JPG dimensions could not be read."
  );
}

export function assertBlogBannerSize(buffer) {
  const { width, height } = readJpegSize(buffer);

  if (width !== 1200 || height !== 630) {
    const error = new Error(
      "Blog banners must be exactly 1200 × 630 pixels."
    );

    error.status = 422;
    throw error;
  }

  return { width, height };
}