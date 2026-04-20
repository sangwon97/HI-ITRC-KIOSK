import * as THREE from 'three';

export const KIOSK_DISPLAY_MODEL_PATHS = [
  '/models/Kiosk_Booths_Imgs.glb',
  '/models/Kiosk_Booths.glb',
  '/models/Kiosk_Building.glb',
  '/models/Kiosk_Building_Imgs.glb',
  '/models/Kiosk_People.glb',
  '/models/Kiosk_SpecialBooths_Imgs.glb',
  '/models/Kiosk_SpecialBooths.glb',
];

export function getScenesFromGltfResult(gltfResult) {
  return (Array.isArray(gltfResult) ? gltfResult : [gltfResult])
    .map((asset) => asset?.scene)
    .filter(Boolean);
}

export function cloneSceneForDisplay(scene, options = {}) {
  const { cloneMaterials = false, raycast = null } = options;
  const clone = scene.clone(true);

  clone.traverse((node) => {
    if (!node.isMesh) {
      return;
    }

    if (cloneMaterials && node.material?.clone) {
      node.material = node.material.clone();
    }

    if (raycast) {
      node.raycast = raycast;
    }
  });

  return clone;
}

export function buildDisplayModelBounds(scenes, options = {}) {
  const { rotationY = 0 } = options;
  const group = new THREE.Group();

  scenes.forEach((scene) => {
    group.add(cloneSceneForDisplay(scene));
  });

  group.rotation.y = rotationY;
  group.updateMatrixWorld(true);

  return new THREE.Box3().setFromObject(group);
}
