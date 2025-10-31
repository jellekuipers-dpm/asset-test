# Asset Test - GLB to KTX2 Converter

This project contains a script to convert GLB files to use KTX2 texture compression, which provides better performance and smaller file sizes for web-based 3D applications.

## Prerequisites

- Node.js (v14 or higher recommended)
- npm

## Installation

Install the required dependencies:

```bash
npm install
```

## Usage

### Convert all GLB files in the assets directory

Run the conversion script:

```bash
npm run convert
```

Or directly:

```bash
node convert-to-ktx2.js
```

This will:
1. Scan the `assets/` directory for all `.glb` files
2. Skip files that already have `-ktx` in their name
3. Convert textures to KTX2 format
4. Save the output files with a `-ktx` suffix (e.g., `model.glb` → `model-ktx.glb`)

### Example Output

```
GLB to KTX2 Converter
=====================

Settings:
  - Quality: 128/255 (lower = smaller files)
  - Compression: 5/5 (higher = better compression)
  - Max texture size: 4096px

Found 5 GLB file(s) to convert
==================================================

Converting: /path/to/assets/bush.glb
  Original size: 10.19 MB
  ✓ Compressed size: 1.54 MB
  ✓ Savings: 84.8% smaller

Converting: /path/to/assets/tree.glb
  Original size: 12.97 MB
  ✓ Compressed size: 2.2 MB
  ✓ Savings: 83.0% smaller

==================================================
Conversion Summary
==================================================
Successfully converted: 5/5 files
Total original size: 52.33 MB
Total compressed size: 9.37 MB
Total savings: 82.1% (42.96 MB saved)

Conversion complete!
```

## What is KTX2?

KTX2 (Khronos Texture 2.0) is a GPU-optimized texture format that:
- **Reduces file sizes by 80-85%** compared to uncompressed textures
- Improves loading times significantly
- Provides hardware-accelerated texture decompression
- Maintains excellent visual quality
- Supported by modern browsers and 3D engines (Three.js, Babylon.js, etc.)

## Configuration

The conversion script uses the following settings (in `convert-to-ktx2.js`):
- **Compression Method**: ETC1S (Basis Universal)
- **Quality**: 128/255 (good balance between size and quality)
- **Compression Level**: 5/5 (maximum compression)
- **Max Texture Size**: 4096px

You can modify these settings at the top of the script:
```javascript
const QUALITY = 128;        // Lower = smaller files (range: 1-255)
const COMPRESSION = 5;      // Higher = better compression (range: 0-5)
const MAX_TEXTURE_SIZE = 4096;
```

**Compression Tips:**
- For production builds, use `QUALITY = 128` and `COMPRESSION = 5` (best compression)
- For development/preview, increase `QUALITY` to 192 for faster encoding
- For normal maps, consider using higher quality (192-255) to preserve detail

## Dependencies

- `@gltf-transform/cli` - GLB file manipulation
- `@gltf-transform/core` - Core glTF transform library
- `@gltf-transform/functions` - Transformation functions
- `@gltf-transform/extensions` - glTF extensions support
- `sharp` - Image processing (included via gltf-transform)

## Troubleshooting

If you encounter errors:
1. Make sure all dependencies are installed: `npm install`
2. Check that your GLB files are valid
3. Ensure you have write permissions in the `assets/` directory

## License

ISC