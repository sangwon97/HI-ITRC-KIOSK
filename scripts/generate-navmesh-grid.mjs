import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { buildNavmeshGrid } from '../src/utils/navmeshPath.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourcePath = resolve(projectRoot, 'public/models/Map_Kiosk_NavMeshMovable.glb');
const outputPath = resolve(projectRoot, 'public/data/navmesh/Map_Kiosk_NavMeshMovable.grid.json');

async function loadGltfScene(path) {
  const loader = new GLTFLoader();
  const fileBuffer = await readFile(path);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength,
  );

  return new Promise((resolveScene, rejectScene) => {
    loader.parse(
      arrayBuffer,
      '',
      (gltf) => resolveScene(gltf.scene),
      (error) => rejectScene(error),
    );
  });
}

async function main() {
  const scene = await loadGltfScene(sourcePath);
  const grid = buildNavmeshGrid(scene, { cellSize: 0.6 });

  if (!grid) {
    throw new Error('Failed to build navmesh grid from GLB.');
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(grid));

  console.log(`Generated navmesh grid: ${outputPath}`);
  console.log(`Grid size: ${grid.rows} rows x ${grid.cols} cols`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
