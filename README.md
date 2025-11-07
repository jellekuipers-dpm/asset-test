# Asset Test

## Installation

Install the required dependencies:

```bash
npm install
```

## Usage

### Convert GLB to KTX2

Add GLB to `/assets/` folder

```bash
npm run convert
```

### Compress textures

- In Blender, go to File > External Data > Unpack Resources.
- Choose "Use files in current directory (create when necessary)".
  - Blender will create a textures folder next to your `.blend` file, filled with all the images used in your model.
- Copy the exported textures to `/assets/textures/` folder

```bash
npm run compress
```

- Replace the exported textures with the generated textures from `/assets/textures-compressed`

