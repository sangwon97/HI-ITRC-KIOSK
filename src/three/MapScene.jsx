import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { compressPath, findNearestWalkable, findPath, worldToCell } from '../utils/navmeshPath';
import genresIcon from '../assets/icons/genres.svg';
import photoCameraIcon from '../assets/icons/photo_camera.svg';
import teacupFilledIcon from '../assets/icons/teacup_filled.svg';
import giftFilledIcon from '../assets/icons/gift_filled.svg';

import { booths, categories } from '../data/booths';
import { ENTRANCE, getBoothPoint, getBoothRoutePoint } from '../utils/mapPath';
import { DEFAULT_MAP_CAMERA } from './mapCameraConfig';

const BOOTH_LOOKUP = new Map(booths.map((booth) => [booth.id, booth]));
const BOOTH_NAME_RE = /^Floor_(S\d+B\d+)$/i;
const DEFAULT_TARGET = new THREE.Vector3(...(DEFAULT_MAP_CAMERA.target ?? [0, 0, 0]));
const NO_RAYCAST = () => null;
const INTRO_DURATION = 1.45;
const INTRO_ROTATION_Y = -Math.PI / 8;
const INTRO_DISTANCE_MULTIPLIER = 1.18;
const INTRO_HEIGHT_OFFSET = 10;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const MAP_MODEL_CACHE = new WeakMap();
const HIT_MESH_CACHE = new WeakMap();
const INSTANCE_DUMMY = new THREE.Object3D();
const SPECIAL_BOOTH_LABELS = [
  { id: 'photo-booth', boothId: 'S6B4', label: '인생네컷', icon: photoCameraIcon },
  { id: 'ai-dance', boothId: 'S10B4', label: 'AI 댄스', icon: genresIcon },
];
const EXHIBITION_ENTRANCE_POINT = [8.35161, 37.4791];

function extractBoothId(name = '') {
  const match = name.match(BOOTH_NAME_RE);
  return match?.[1]?.toUpperCase() ?? null;
}

function getBoothFromObject(object) {
  let current = object;
  while (current) {
    const boothId = current.userData?.boothId ?? extractBoothId(current.name);
    if (boothId) {
      return BOOTH_LOOKUP.get(boothId) ?? null;
    }
    current = current.parent;
  }
  return null;
}

function getBoothPosition(booth, boothPositions) {
  if (!booth) {
    return null;
  }
  return boothPositions[booth.id] ?? null;
}

function createHitMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((item) => createHitMaterial(item));
  }

  const hitMaterial = material?.clone?.() ?? new THREE.MeshBasicMaterial();
  hitMaterial.transparent = true;
  hitMaterial.opacity = 0;
  hitMaterial.depthWrite = false;
  hitMaterial.colorWrite = false;
  hitMaterial.side = THREE.DoubleSide;
  hitMaterial.toneMapped = false;
  return hitMaterial;
}

function easeOutCubic(value) {
  return 1 - ((1 - value) ** 3);
}

function buildIntroCameraPosition() {
  const target = DEFAULT_TARGET.clone();
  const endPosition = new THREE.Vector3(...DEFAULT_MAP_CAMERA.position);
  const offset = endPosition.clone().sub(target);

  offset.multiplyScalar(INTRO_DISTANCE_MULTIPLIER);
  offset.applyAxisAngle(Y_AXIS, INTRO_ROTATION_Y);
  offset.y += INTRO_HEIGHT_OFFSET;

  return target.add(offset);
}

function KioskMapModel() {
  const { scene } = useGLTF('/models/Map_Kiosk.glb');
  const model = useMemo(() => {
    const cachedModel = MAP_MODEL_CACHE.get(scene);
    if (cachedModel) {
      return cachedModel;
    }

    scene.traverse((node) => {
      if (node.isMesh) {
        node.raycast = NO_RAYCAST;
      }
    });

    MAP_MODEL_CACHE.set(scene, scene);
    return scene;
  }, [scene]);
  return <primitive object={model} />;
}

function BoothHitAreas({ onHover, onSelect, boothPositions }) {
  const { scene } = useGLTF('/models/KioskBoothArea.glb');
  const [hoveredBooth, setHoveredBooth] = useState(null);
  const hoveredBoothIdRef = useRef(null);
  const pressRef = useRef(null);

  const interactiveMeshes = useMemo(() => {
    const cachedMeshes = HIT_MESH_CACHE.get(scene);
    if (cachedMeshes) {
      return cachedMeshes;
    }

    const clone = scene.clone(true);
    const meshes = [];
    clone.traverse((node) => {
      if (!node.isMesh) {
        return;
      }

      const boothId = extractBoothId(node.name);
      if (!boothId || !BOOTH_LOOKUP.has(boothId)) {
        return;
      }

      node.material = createHitMaterial(node.material);
      node.userData.boothId = boothId;
      node.renderOrder = 1000;
      meshes.push(node);
    });

    HIT_MESH_CACHE.set(scene, meshes);
    return meshes;
  }, [scene]);

  const updateHoveredBooth = useCallback((booth) => {
    const nextBoothId = booth?.id ?? null;
    if (hoveredBoothIdRef.current === nextBoothId) {
      return;
    }

    hoveredBoothIdRef.current = nextBoothId;
    setHoveredBooth(booth);
    onHover(booth);
  }, [onHover]);

  const clearHoveredBooth = useCallback(() => {
    hoveredBoothIdRef.current = null;
    setHoveredBooth(null);
    onHover(null);
  }, [onHover]);

  const resolveBooth = useCallback((event) => getBoothFromObject(event.object), []);

  const handlePointerMove = useCallback((event) => {
    const booth = resolveBooth(event);
    if (!booth) {
      clearHoveredBooth();
      return;
    }

    event.stopPropagation();
    updateHoveredBooth(booth);
  }, [clearHoveredBooth, resolveBooth, updateHoveredBooth]);

  const handlePointerOut = useCallback((event) => {
    const booth = resolveBooth(event);
    if (booth) {
      event.stopPropagation();
    }
    clearHoveredBooth();
  }, [clearHoveredBooth, resolveBooth]);

  const handlePointerDown = useCallback((event) => {
    const booth = resolveBooth(event);
    if (!booth) {
      return;
    }

    event.stopPropagation();
    pressRef.current = {
      boothId: booth.id,
      x: event.clientX ?? 0,
      y: event.clientY ?? 0,
    };
  }, [resolveBooth]);

  const handlePointerUp = useCallback((event) => {
    const booth = resolveBooth(event);
    const press = pressRef.current;
    pressRef.current = null;

    if (!booth || !press || press.boothId !== booth.id) {
      return;
    }

    const dx = (event.clientX ?? 0) - press.x;
    const dy = (event.clientY ?? 0) - press.y;
    if (Math.hypot(dx, dy) > 10) {
      return;
    }

    event.stopPropagation();
    onSelect(booth);
  }, [onSelect, resolveBooth]);

  const handlePointerCancel = useCallback(() => {
    pressRef.current = null;
  }, []);

  const handleClick = useCallback((event) => {
    const booth = resolveBooth(event);
    if (!booth) {
      return;
    }

    event.stopPropagation();
    onSelect(booth);
  }, [onSelect, resolveBooth]);

  return (
    <group>
      <HoverHighlight booth={hoveredBooth} boothPositions={boothPositions} />
      {interactiveMeshes.map((mesh) => (
        <primitive
          key={mesh.uuid}
          object={mesh}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleClick}
        />
      ))}
    </group>
  );
}

function CategoryLabels({ boothPositions }) {
  const labels = useMemo(() => {
    return categories
      .map((category) => {
        const categoryBooths = booths.filter((booth) => booth.category === category.id);
        const points = categoryBooths
          .map((booth) => boothPositions[booth.id])
          .filter(Boolean);

        if (points.length === 0) {
          return null;
        }

        const sum = points.reduce(
          (accumulator, point) => ({
            x: accumulator.x + point[0],
            z: accumulator.z + point[1],
          }),
          { x: 0, z: 0 },
        );

        return {
          id: category.id,
          label: category.label,
          color: category.color,
          x: sum.x / points.length,
          z: sum.z / points.length,
        };
      })
      .filter(Boolean);
  }, [boothPositions]);

  return (
    <group>
      {labels.map((label) => {
        const whiteCategory = label.color.toLowerCase() === '#ffffff';
        return (
          <Html
            key={label.id}
            position={[label.x, 4.6, label.z]}
            center
            distanceFactor={10}
            sprite
            transform
            occlude={false}
            zIndexRange={[6, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="map3d-category-label"
              style={{
                '--cat-bg': label.color,
                '--cat-text': whiteCategory ? '#101820' : '#f6fffd',
                '--cat-border': whiteCategory ? 'rgba(16, 24, 32, 0.18)' : 'rgba(255, 255, 255, 0.16)',
              }}
            >
              {label.label}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function VenueFeatureLabels({ boothPositions }) {
  const labels = useMemo(() => {
    const nextLabels = [];

    SPECIAL_BOOTH_LABELS.forEach((label) => {
      const point = boothPositions[label.boothId];
      if (!point) {
        return;
      }

      nextLabels.push({
        ...label,
        x: point[0],
        y: 4.35,
        z: point[1],
      });
    });

    const s6b7 = boothPositions.S6B7;
    const s6b8 = boothPositions.S6B8;
    if (s6b7 && s6b8) {
      nextLabels.push({
        id: 'photo-wall',
        label: '포토월',
        icon: photoCameraIcon,
        x: (s6b7[0] + s6b8[0]) * 0.5,
        y: 4.2,
        z: (s6b7[1] + s6b8[1]) * 0.5,
      });
    }

    const s9b9 = boothPositions.S9B9;
    if (s9b9) {
      nextLabels.push({
        id: 'catering-zone',
        label: '케이터링',
        icon: teacupFilledIcon,
        x: s9b9[0] - 1.0,
        y: 4.25,
        z: s9b9[1] - 6.5,
      });
    }

    const photoBooth = boothPositions.S6B4;
    if (photoBooth) {
      nextLabels.push({
        id: 'lucky-draw',
        label: '럭키드로우',
        icon: giftFilledIcon,
        x: photoBooth[0] - 3.5,
        y: 4.2,
        z: photoBooth[1],
      });
    }

    nextLabels.push({
      id: 'exhibition-entrance',
      label: '전시장 입구',
      icon: null,
      x: EXHIBITION_ENTRANCE_POINT[0],
      y: 4.1,
      z: EXHIBITION_ENTRANCE_POINT[1],
    });

    return nextLabels;
  }, [boothPositions]);

  return (
    <group>
      {labels.map((label) => (
        <Html
          key={label.id}
          position={[label.x, label.y, label.z]}
          center
          distanceFactor={9}
          sprite
          transform
          occlude={false}
          zIndexRange={[6, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className={label.icon ? 'map3d-special-label map3d-special-label--feature' : 'map3d-special-label map3d-special-label--entrance'}>
            {label.icon ? (
              <>
                <div className="map3d-special-label-badge">
                  <img className="map3d-special-label-icon" src={label.icon} alt="" aria-hidden="true" />
                </div>
                <div className="map3d-special-label-caption">{label.label}</div>
              </>
            ) : (
              <span className="map3d-special-label-entrance-text">{label.label}</span>
            )}
          </div>
        </Html>
      ))}
    </group>
  );
}

function HoverHighlight({ booth, boothPositions }) {
  const position = getBoothPosition(booth, boothPositions);

  return (
    <mesh
      raycast={NO_RAYCAST}
      position={position ? [position[0], 0.05, position[1]] : [0, -999, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[3.2, 5.8]} />
      <meshBasicMaterial
        color={0xffd84d}
        transparent
        opacity={0.38}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SelectionRing({ booth, boothPositions }) {
  const ringRef = useRef();
  const pulse = useRef(0);
  const position = getBoothPosition(booth, boothPositions);

  useFrame((_, delta) => {
    if (!ringRef.current) {
      return;
    }

    pulse.current += delta * 3;
    ringRef.current.material.opacity = booth
      ? 0.5 + 0.35 * Math.sin(pulse.current)
      : Math.max(0, ringRef.current.material.opacity - 0.05);
  });

  return (
    <mesh
      ref={ringRef}
      raycast={NO_RAYCAST}
      position={position ? [position[0], 0.08, position[1]] : [0, -999, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={18}
    >
      <ringGeometry args={[1.4, 2.1, 32]} />
      <meshBasicMaterial
        color={0xffffff}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function EntranceMarker() {
  const outerRef = useRef();
  const innerRef = useRef();
  const arrowRef = useRef();
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 2;
    if (outerRef.current) {
      outerRef.current.material.opacity = 0.3 + 0.2 * Math.sin(t.current);
      outerRef.current.scale.setScalar(1 + 0.15 * Math.sin(t.current * 0.7));
    }
    if (innerRef.current) {
      innerRef.current.material.opacity = 0.8 + 0.2 * Math.sin(t.current * 1.3);
    }
    if (arrowRef.current) {
      arrowRef.current.position.y = 1.4 + 0.24 * Math.abs(Math.sin(t.current * 1.55));
      arrowRef.current.scale.setScalar(1 + 0.05 * Math.sin(t.current * 1.55));
    }
  });

  return (
    <group position={[ENTRANCE[0], 0.05, ENTRANCE[2]]}>
      <mesh ref={outerRef} raycast={NO_RAYCAST} rotation={[-Math.PI / 2, 0, 0]} renderOrder={18}>
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial color={0x00ffaa} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={innerRef} raycast={NO_RAYCAST} rotation={[-Math.PI / 2, 0, 0]} renderOrder={19}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color={0x00ffaa} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <group ref={arrowRef} position={[0, 1.08, 0]} renderOrder={19}>
        <mesh raycast={NO_RAYCAST} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.44, 0.86, 24]} />
          <meshStandardMaterial
            color={0x7affdb}
            emissive={0x00ffaa}
            emissiveIntensity={0.62}
            metalness={0.12}
            roughness={0.24}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>
      <Html
        position={[0, 5.0, 0]}
        center
        distanceFactor={9}
        sprite
        transform
        occlude={false}
        zIndexRange={[8, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="map3d-entrance-label">현재 위치</div>
      </Html>
    </group>
  );
}

function PathGuide({ pathPoints, targetBooth, boothPositions }) {
  const arrowMeshRef = useRef(null);
  const targetPoint2D = targetBooth ? getBoothPoint(targetBooth.id, boothPositions) : null;

  const arrowGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0.34, 0, 0,
          -0.14, 0, 0.18,
          -0.14, 0, -0.18,
        ]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  const { segments, arrowMarkers } = useMemo(() => {
    if (!pathPoints || pathPoints.length < 2) {
      return { segments: [], arrowMarkers: [] };
    }

    const nextSegments = [];
    const nextArrowMarkers = [];
    const arrowSpacing = 2.0;

    for (let index = 0; index < pathPoints.length - 1; index += 1) {
      const start = pathPoints[index];
      const end = pathPoints[index + 1];
      const dx = end[0] - start[0];
      const dz = end[2] - start[2];
      const horizontal = Math.abs(dx) >= Math.abs(dz);
      const distance = horizontal ? Math.abs(dx) : Math.abs(dz);

      if (distance < 0.001) {
        continue;
      }

      const directionX = horizontal ? Math.sign(dx) : 0;
      const directionZ = horizontal ? 0 : Math.sign(dz);
      const rotationY = horizontal
        ? directionX > 0 ? 0 : Math.PI
        : directionZ > 0 ? -Math.PI / 2 : Math.PI / 2;

      nextSegments.push({
        key: `segment-${index}`,
        position: [(start[0] + end[0]) * 0.5, Math.max(start[1], end[1]) + 0.02, (start[2] + end[2]) * 0.5],
        size: [
          horizontal ? distance + 1.2 : 1.15,
          0.07,
          horizontal ? 1.15 : distance + 1.2,
        ],
      });

      const arrowCount = Math.max(1, Math.floor(distance / arrowSpacing));
      for (let arrowIndex = 0; arrowIndex < arrowCount; arrowIndex += 1) {
        nextArrowMarkers.push({
          key: `arrow-${index}-${arrowIndex}`,
          start,
          directionX,
          directionZ,
          distance,
          offset: (arrowIndex / arrowCount) * distance,
          rotationY,
          y: Math.max(start[1], end[1]) + 0.06,
        });
      }
    }

    return { segments: nextSegments, arrowMarkers: nextArrowMarkers };
  }, [pathPoints]);

  useFrame(({ clock }) => {
    const arrowMesh = arrowMeshRef.current;
    if (!arrowMesh || arrowMarkers.length === 0) {
      return;
    }

    const seconds = clock.getElapsedTime() * 0.8;
    arrowMarkers.forEach((marker, index) => {
      const progress = (seconds + marker.offset) % marker.distance;
      INSTANCE_DUMMY.position.set(
        marker.start[0] + marker.directionX * progress,
        marker.y,
        marker.start[2] + marker.directionZ * progress,
      );
      INSTANCE_DUMMY.rotation.set(0, marker.rotationY, 0);
      INSTANCE_DUMMY.updateMatrix();
      arrowMesh.setMatrixAt(index, INSTANCE_DUMMY.matrix);
    });
    arrowMesh.instanceMatrix.needsUpdate = true;
  });

  if (!pathPoints || pathPoints.length < 2) {
    return null;
  }

  return (
    <group>
      {segments.map((segment) => (
        <mesh key={segment.key} raycast={NO_RAYCAST} position={segment.position} renderOrder={6}>
          <boxGeometry args={segment.size} />
          <meshBasicMaterial
            color={0x00b4ff}
            transparent
            opacity={0.24}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {targetPoint2D && (
        <>
          <mesh
            raycast={NO_RAYCAST}
            position={[targetPoint2D[0], 0.03, targetPoint2D[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={13}
          >
            <ringGeometry args={[0.5, 0.8, 32]} />
            <meshBasicMaterial
              color={0xffffff}
              transparent
              opacity={0.92}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            raycast={NO_RAYCAST}
            position={[targetPoint2D[0], 0.031, targetPoint2D[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={13}
          >
            <circleGeometry args={[0.23, 24]} />
            <meshBasicMaterial
              color={0x00b4ff}
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {arrowMarkers.length > 0 && (
        <instancedMesh
          ref={arrowMeshRef}
          geometry={arrowGeo}
          raycast={NO_RAYCAST}
          renderOrder={7}
          args={[null, null, arrowMarkers.length]}
        >
          <meshBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.95}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </group>
  );
}

export function CameraController({ targetBoothPos, boothPositions, introSignal, resetSignal, controlsRef }) {
  const lerpTarget = useRef(DEFAULT_TARGET.clone());
  const lerpCamera = useRef(null);
  const isTargetAnimating = useRef(false);
  const isCameraAnimating = useRef(false);
  const introElapsed = useRef(0);
  const introFromCamera = useRef(null);
  const introToCamera = useRef(new THREE.Vector3(...DEFAULT_MAP_CAMERA.position));
  const isIntroAnimating = useRef(false);
  const lastIntroSignal = useRef(0);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return undefined;
    }

    const handleStart = () => {
      isIntroAnimating.current = false;
      isTargetAnimating.current = false;
      isCameraAnimating.current = false;
      lerpTarget.current.copy(controls.target);
      lerpCamera.current = null;
    };

    controls.addEventListener('start', handleStart);
    return () => {
      controls.removeEventListener('start', handleStart);
    };
  }, [controlsRef]);

  useEffect(() => {
    if (!targetBoothPos) {
      return;
    }

    const position = boothPositions[targetBoothPos.id];
    if (position) {
      lerpTarget.current.set(position[0], 0, position[1]);
      isTargetAnimating.current = true;
      lerpCamera.current = null;
      isCameraAnimating.current = false;
    }
  }, [targetBoothPos]);

  useEffect(() => {
    if (resetSignal > 0) {
      lerpTarget.current.copy(DEFAULT_TARGET);
      isTargetAnimating.current = true;
      lerpCamera.current = new THREE.Vector3(...DEFAULT_MAP_CAMERA.position);
      isCameraAnimating.current = true;
    }
  }, [resetSignal]);

  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    if (!targetBoothPos && introSignal > lastIntroSignal.current) {
      lastIntroSignal.current = introSignal;
      const introCameraPosition = buildIntroCameraPosition();

      controls.target.copy(DEFAULT_TARGET);
      camera.position.copy(introCameraPosition);
      introFromCamera.current = introCameraPosition;
      introToCamera.current.set(...DEFAULT_MAP_CAMERA.position);
      introElapsed.current = 0;
      isIntroAnimating.current = true;
      isTargetAnimating.current = false;
      isCameraAnimating.current = false;
      lerpCamera.current = null;
      controls.update();
    }

    if (isIntroAnimating.current && introFromCamera.current) {
      introElapsed.current += delta;
      const progress = Math.min(introElapsed.current / INTRO_DURATION, 1);
      const easedProgress = easeOutCubic(progress);

      camera.position.lerpVectors(introFromCamera.current, introToCamera.current, easedProgress);
      controls.target.copy(DEFAULT_TARGET);

      if (progress >= 1) {
        camera.position.copy(introToCamera.current);
        isIntroAnimating.current = false;
      }

      controls.update();
      return;
    }

    if (isTargetAnimating.current) {
      controls.target.lerp(lerpTarget.current, 0.07);
      if (controls.target.distanceTo(lerpTarget.current) < 0.05) {
        controls.target.copy(lerpTarget.current);
        isTargetAnimating.current = false;
      }
    }

    if (isCameraAnimating.current && lerpCamera.current) {
      camera.position.lerp(lerpCamera.current, 0.07);
      if (camera.position.distanceTo(lerpCamera.current) < 0.5) {
        camera.position.copy(lerpCamera.current);
        lerpCamera.current = null;
        isCameraAnimating.current = false;
      }
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={(Math.PI * 75) / 180}
      minDistance={15}
      maxDistance={125}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      panSpeed={0.8}
    />
  );
}

export default function MapScene({
  onSelect,
  onHover,
  selectedBooth,
  pathPoints,
  boothPositions = {},
  boothFrontPositions = {},
  navmeshGrid = null,
  controlsRef,
  introSignal,
  resetSignal,
}) {
  const handleHover = useCallback((booth) => onHover(booth), [onHover]);
  const handleSelect = useCallback((booth) => onSelect(booth), [onSelect]);
  const targetBoothPos = selectedBooth || null;
  const resolvedPathCache = useMemo(() => new Map(), [boothFrontPositions, boothPositions, navmeshGrid]);
  const resolvedPathPoints = useMemo(() => {
    if (!selectedBooth) {
      return pathPoints;
    }

    const cachedPath = resolvedPathCache.get(selectedBooth.id);
    if (cachedPath) {
      return cachedPath;
    }

    const boothPoint = getBoothPoint(selectedBooth.id, boothPositions);
    const boothRoutePoint = getBoothRoutePoint(selectedBooth.id, boothPositions, boothFrontPositions);
    if (!boothPoint || !boothRoutePoint || !navmeshGrid) {
      return pathPoints;
    }

    const startCell = findNearestWalkable(
      worldToCell(ENTRANCE[0], ENTRANCE[2], navmeshGrid),
      navmeshGrid,
    );
    const goalCell = findNearestWalkable(
      worldToCell(boothRoutePoint[0], boothRoutePoint[1], navmeshGrid),
      navmeshGrid,
    );

    const cellPath = findPath(startCell, goalCell, navmeshGrid);
    const navmeshPath = compressPath(cellPath, navmeshGrid);
    const basePath = navmeshPath.length > 1 ? navmeshPath : pathPoints;

    if (!basePath || basePath.length === 0) {
      return basePath;
    }

    const lastPoint = basePath[basePath.length - 1];
    const boothCenterPoint = [boothPoint[0], lastPoint?.[1] ?? 0.15, boothPoint[1]];
    const distanceToCenter = Math.hypot(
      (lastPoint?.[0] ?? boothCenterPoint[0]) - boothCenterPoint[0],
      (lastPoint?.[2] ?? boothCenterPoint[2]) - boothCenterPoint[2],
    );

    const resolvedPath = distanceToCenter > 0.05 ? [...basePath, boothCenterPoint] : basePath;
    resolvedPathCache.set(selectedBooth.id, resolvedPath);
    return resolvedPath;
  }, [boothFrontPositions, boothPositions, navmeshGrid, pathPoints, resolvedPathCache, selectedBooth]);

  return (
    <>
      <ambientLight color={0xe8f4ff} intensity={1.8} />
      <directionalLight color={0xffffff} intensity={0.6} position={[-8, 30, 15]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color={0xd8e8f4} />
      </mesh>

      <KioskMapModel />
      <BoothHitAreas onHover={handleHover} onSelect={handleSelect} boothPositions={boothPositions} />
      <CategoryLabels boothPositions={boothPositions} />
      <VenueFeatureLabels boothPositions={boothPositions} />
      <SelectionRing booth={selectedBooth} boothPositions={boothPositions} />
      <EntranceMarker />
      <PathGuide pathPoints={resolvedPathPoints} targetBooth={selectedBooth} boothPositions={boothPositions} />

      <CameraController
        targetBoothPos={targetBoothPos}
        boothPositions={boothPositions}
        introSignal={introSignal}
        resetSignal={resetSignal}
        controlsRef={controlsRef}
      />
    </>
  );
}

useGLTF.preload('/models/Map_Kiosk.glb');
useGLTF.preload('/models/KioskBoothArea.glb');
