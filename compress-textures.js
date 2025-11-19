const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const inputDir = "./assets/textures";
const outputDir = "./assets/textures-compressed";

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// TGA file parser and writer
function parseTGA(buffer) {
  const idLength = buffer[0];
  const colorMapType = buffer[1];
  const imageType = buffer[2];

  const width = buffer[12] | (buffer[13] << 8);
  const height = buffer[14] | (buffer[15] << 8);
  const bitsPerPixel = buffer[16];
  const imageDescriptor = buffer[17];

  const headerSize = 18 + idLength;
  let dataStart = headerSize;

  // Skip color map if present
  if (colorMapType === 1) {
    const colorMapLength = buffer[5] | (buffer[6] << 8);
    const colorMapEntrySize = buffer[7];
    dataStart += colorMapLength * Math.ceil(colorMapEntrySize / 8);
  }

  return {
    width,
    height,
    bitsPerPixel,
    imageType,
    dataStart,
    imageDescriptor,
    buffer,
  };
}

function tgaToRGBA(tgaInfo) {
  const { width, height, bitsPerPixel, dataStart, buffer, imageDescriptor } =
    tgaInfo;
  const bytesPerPixel = Math.floor(bitsPerPixel / 8);
  const rawData = Buffer.alloc(width * height * 4);

  // Check if image is flipped (bit 5 of image descriptor)
  const isFlipped = (imageDescriptor & 0x20) !== 0;

  // Convert BGR/BGRA to RGBA
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcY = isFlipped ? y : height - 1 - y;
      const srcIdx = dataStart + (srcY * width + x) * bytesPerPixel;
      const dstIdx = (y * width + x) * 4;

      if (bytesPerPixel >= 3) {
        rawData[dstIdx] = buffer[srcIdx + 2]; // R (from B)
        rawData[dstIdx + 1] = buffer[srcIdx + 1]; // G
        rawData[dstIdx + 2] = buffer[srcIdx]; // B (from R)
        rawData[dstIdx + 3] = bytesPerPixel === 4 ? buffer[srcIdx + 3] : 255; // A
      }
    }
  }

  return rawData;
}

function createTGABuffer(width, height, rgbaPixels) {
  const bytesPerPixel = 4;
  const headerSize = 18;
  const dataSize = width * height * bytesPerPixel;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // TGA Header
  buffer[0] = 0; // ID length
  buffer[1] = 0; // Color map type (no color map)
  buffer[2] = 2; // Image type (uncompressed true-color)
  buffer[3] = 0; // Color map specification (5 bytes)
  buffer[4] = 0;
  buffer[5] = 0;
  buffer[6] = 0;
  buffer[7] = 0;
  buffer[8] = 0; // X-origin
  buffer[9] = 0;
  buffer[10] = 0; // Y-origin
  buffer[11] = 0;
  buffer[12] = width & 0xff; // Width (low byte)
  buffer[13] = (width >> 8) & 0xff; // Width (high byte)
  buffer[14] = height & 0xff; // Height (low byte)
  buffer[15] = (height >> 8) & 0xff; // Height (high byte)
  buffer[16] = 32; // Bits per pixel
  buffer[17] = 0x28; // Image descriptor (top-left origin, 8-bit alpha)

  // Write pixel data (BGRA format for TGA)
  for (let i = 0; i < rgbaPixels.length; i += 4) {
    const offset = headerSize + i;
    buffer[offset] = rgbaPixels[i + 2]; // B (from R)
    buffer[offset + 1] = rgbaPixels[i + 1]; // G
    buffer[offset + 2] = rgbaPixels[i]; // R (from B)
    buffer[offset + 3] = rgbaPixels[i + 3]; // A
  }

  return buffer;
}

async function processTGA(inputPath, outputPath) {
  const buffer = fs.readFileSync(inputPath);
  const tgaInfo = parseTGA(buffer);
  const rgbaData = tgaToRGBA(tgaInfo);

  // Process with Sharp
  let image = sharp(rgbaData, {
    raw: {
      width: tgaInfo.width,
      height: tgaInfo.height,
      channels: 4,
    },
  });

  // Resize to max 1024px (maintaining aspect ratio)
  const maxSize = 512;
  if (tgaInfo.width > maxSize || tgaInfo.height > maxSize) {
    image = image.resize(maxSize, maxSize, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Get processed RGBA data
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Write as TGA
  const tgaOutput = createTGABuffer(info.width, info.height, data);
  fs.writeFileSync(outputPath, tgaOutput);
}

// Get all files from input directory
const files = fs.readdirSync(inputDir);

// Filter for JPEG, PNG, and TGA files
const imageFiles = files.filter((file) => {
  const ext = path.extname(file).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".tga"].includes(ext);
});

console.log(`Found ${imageFiles.length} image files to process`);

// Process each file
async function processImage(filename) {
  const inputPath = path.join(inputDir, filename);
  const outputPath = path.join(outputDir, filename);
  const ext = path.extname(filename).toLowerCase();

  try {
    const inputSize = fs.statSync(inputPath).size;

    if (ext === ".tga") {
      await processTGA(inputPath, outputPath);
    } else {
      let image = sharp(inputPath);
      const metadata = await image.metadata();

      // Resize to max 1024px (maintaining aspect ratio)
      const maxSize = 1024;
      if (metadata.width > maxSize || metadata.height > maxSize) {
        image = image.resize(maxSize, maxSize, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      // Apply compression based on file type
      if (ext === ".jpg" || ext === ".jpeg") {
        await image.jpeg({ quality: 85, mozjpeg: true }).toFile(outputPath);
      } else if (ext === ".png") {
        await image
          .png({ compressionLevel: 9, quality: 85 })
          .toFile(outputPath);
      }
    }

    const outputSize = fs.statSync(outputPath).size;
    const savings = ((1 - outputSize / inputSize) * 100).toFixed(2);

    console.log(
      `✓ ${filename} - ${(inputSize / 1024).toFixed(2)}KB → ${(outputSize / 1024).toFixed(2)}KB (${savings}% reduction)`,
    );
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message);
  }
}

// Process all images
async function processAll() {
  console.log("Starting compression...\n");

  for (const file of imageFiles) {
    await processImage(file);
  }

  console.log("\nCompression complete!");
}

processAll().catch(console.error);
