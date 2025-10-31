#!/usr/bin/env node

const { readdirSync, statSync } = require("fs");
const { join, parse } = require("path");
const { execSync } = require("child_process");

const ASSETS_DIR = join(__dirname, "assets");

// Compression settings
const QUALITY = 128; // 1-255, lower = smaller files, slightly lower quality (128 is good balance)
const COMPRESSION = 5; // 0-5, higher = better compression (slower)
const MAX_TEXTURE_SIZE = 4096; // Maximum texture dimension

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileSize(filePath) {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

function convertGlbToKtx2(inputPath, outputPath) {
  const inputSize = getFileSize(inputPath);

  console.log(`\nConverting: ${inputPath}`);
  console.log(`  Original size: ${formatBytes(inputSize)}`);

  try {
    // Use gltf-transform CLI with ETC1S compression
    // ETC1S provides excellent compression (~10-20x) with minimal quality loss
    const command = `npx gltf-transform etc1s "${inputPath}" "${outputPath}" --quality ${QUALITY} --compression ${COMPRESSION}`;

    execSync(command, {
      stdio: "pipe",
      cwd: __dirname,
    });

    const outputSize = getFileSize(outputPath);
    const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

    console.log(`  ✓ Compressed size: ${formatBytes(outputSize)}`);
    console.log(`  ✓ Savings: ${savings}% smaller`);

    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("GLB to KTX2 Converter");
  console.log("=====================\n");
  console.log("Settings:");
  console.log(`  - Quality: ${QUALITY}/255 (lower = smaller files)`);
  console.log(
    `  - Compression: ${COMPRESSION}/5 (higher = better compression)`,
  );
  console.log(`  - Max texture size: ${MAX_TEXTURE_SIZE}px\n`);

  // Read all files in assets directory
  const files = readdirSync(ASSETS_DIR);

  // Filter for .glb files that don't already have -ktx suffix
  const glbFiles = files.filter(
    (file) => file.endsWith(".glb") && !file.includes("-ktx"),
  );

  if (glbFiles.length === 0) {
    console.log("No GLB files found to convert.");
    return;
  }

  console.log(`Found ${glbFiles.length} GLB file(s) to convert`);
  console.log("=".repeat(50));

  let successCount = 0;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  // Convert each file
  for (const file of glbFiles) {
    const inputPath = join(ASSETS_DIR, file);
    const { name, ext } = parse(file);
    const outputPath = join(ASSETS_DIR, `${name}-ktx${ext}`);

    totalOriginalSize += getFileSize(inputPath);

    const success = convertGlbToKtx2(inputPath, outputPath);

    if (success) {
      successCount++;
      totalCompressedSize += getFileSize(outputPath);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("Conversion Summary");
  console.log("=".repeat(50));
  console.log(
    `Successfully converted: ${successCount}/${glbFiles.length} files`,
  );

  if (successCount > 0) {
    const totalSavings = (
      (1 - totalCompressedSize / totalOriginalSize) *
      100
    ).toFixed(1);
    console.log(`Total original size: ${formatBytes(totalOriginalSize)}`);
    console.log(`Total compressed size: ${formatBytes(totalCompressedSize)}`);
    console.log(
      `Total savings: ${totalSavings}% (${formatBytes(totalOriginalSize - totalCompressedSize)} saved)`,
    );
  }

  console.log("\nConversion complete!");
}

main().catch(console.error);
