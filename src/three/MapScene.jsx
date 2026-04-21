import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { compressPath, findNearestWalkable, findPath, worldToCell } from '../utils/navmeshPath';
import genresIcon from '../assets/icons/genres.svg';
import photoCameraIcon from '../assets/icons/photo_camera.svg';
import splitScreenPortraitIcon from '../assets/icons/splitscreen_portrait.svg';
import teacupFilledIcon from '../assets/icons/teacup_filled.svg';
import giftFilledIcon from '../assets/icons/gift_filled.svg';
import wcIcon from '../assets/icons/wc.svg';

import { booths, categories } from '../data/booths';
import { ENTRANCE, getBoothPoint, getBoothRoutePoint } from '../utils/mapPath';
import { DEFAULT_MAP_CAMERA } from './mapCameraConfig';
import {
  getScenesFromGltfResult,
  KIOSK_DISPLAY_MODEL_PATHS,
} from './kioskDisplayModels';

const EVENT_BOOTHS_CARPET_MODEL_PATH = '/models/Kiosk_EventBooths_Carpet.glb';
const BOOTH_LOOKUP = new Map(booths.map((booth) => [booth.id, booth]));
const CATEGORY_LOOKUP = new Map(categories.map((category) => [category.id, category]));
const EXR_ENV_URL = `${import.meta.env.BASE_URL}textures_background.exr`;
const BOOTH_NAME_RE = /^Floor_((?:S\d+B\d+)|(?:Special\d+))$/i;
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
const SECTION_ID_BY_CATEGORY = {
  ai_bigdata: 'Section1',
  next_gen_comm: 'Section2',
  bio_healthcare: 'Section3',
  cloud_security: 'Section4',
  immersive_sw: 'Section5',
  quantum: 'Section6',
  ai_semiconductor: 'Section7',
  ai_platform: 'Section8',
  ict_industry: 'Section9',
  robotics_mobility: 'Section10',
  special_exhibition: 'Section_Special',
};
const SPECIAL_EXHIBITION_COLOR = '#8d96a0';
const FEATURE_LABELS = [
  {
    id: 'photo-booth',
    positionId: 'Life4Cut',
    label: '인생네컷',
    icon: photoCameraIcon,
    interactive: true,
    description: '현장에서 기념 사진을 남길 수 있는 포토 이벤트 부스입니다.',
  },
  {
    id: 'ai-dance',
    positionId: 'New_Dance',
    label: 'AI 댄스',
    icon: genresIcon,
    interactive: true,
    description: 'AI와 함께 움직임을 체험하는 참여형 댄스 이벤트 부스입니다.',
  },
  {
    id: 'photo-wall',
    positionId: 'Photo_Zone',
    label: '포토존',
    icon: photoCameraIcon,
    interactive: true,
    description: '행사 방문을 기념할 수 있는 촬영 포인트입니다.',
  },
  {
    id: 'catering-zone',
    positionId: 'Coffee_Catering',
    label: '케이터링',
    icon: teacupFilledIcon,
    interactive: true,
    description: '관람 중 잠시 쉬어갈 수 있는 케이터링 공간입니다.',
  },
  {
    id: 'lucky-draw',
    positionId: 'Lucky_Draw',
    label: '럭키드로우',
    icon: giftFilledIcon,
    interactive: true,
    description: '현장 참여를 통해 경품 이벤트를 즐길 수 있는 부스입니다.',
  },
  { id: 'itrc-booth', positionId: 'ITRC_Booth', label: 'ITRC 산학협력관', icon: null },
  { id: 'toilet-1', positionId: 'Toilet1', label: '화장실', icon: wcIcon },
  { id: 'toilet-2', positionId: 'Toilet2', label: '화장실', icon: wcIcon },
  { id: 'exit', positionId: 'Exit', label: '전시장 출구', icon: null },
  { id: 'exhibition-entrance', positionId: 'Entrance', label: '전시장 입구', icon: null },
];

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
  const gltfResult = useGLTF(KIOSK_DISPLAY_MODEL_PATHS);
  const carpetGltfResult = useGLTF(EVENT_BOOTHS_CARPET_MODEL_PATH);
  const scenes = useMemo(
    () => [
      ...getScenesFromGltfResult(gltfResult),
      ...getScenesFromGltfResult(carpetGltfResult),
    ],
    [carpetGltfResult, gltfResult],
  );
  const models = useMemo(() => scenes.map((scene) => {
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
  }), [scenes]);

  return (
    <group>
      {models.map((model, index) => (
        <primitive key={`${model.uuid}-${index}`} object={model} />
      ))}
    </group>
  );
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

function CategoryLabels({ kioskInfoPositions }) {
  const labels = useMemo(() => {
    return categories
      .map((category) => {
        const point = kioskInfoPositions?.[SECTION_ID_BY_CATEGORY[category.id]];
        if (!point) {
          return null;
        }

        return {
          id: category.id,
          label: category.label,
          color: category.id === 'special_exhibition' ? SPECIAL_EXHIBITION_COLOR : category.color,
          x: point[0],
          z: point[1],
        };
      })
      .filter(Boolean);
  }, [kioskInfoPositions]);

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

function VenueFeatureLabels({ kioskInfoPositions, currentKioskId }) {
  const labels = useMemo(() => {
    const nextLabels = FEATURE_LABELS.reduce((accumulator, feature) => {
      const point = kioskInfoPositions?.[feature.positionId];
      if (!point) {
        return accumulator;
      }

      accumulator.push({
        ...feature,
        x: point[0],
        y: 4.25,
        z: point[1],
      });
      return accumulator;
    }, []);

    return nextLabels;
  }, [currentKioskId, kioskInfoPositions]);

  return (
    <group>
      {labels.map((label) => {
        const isItrcBooth = label.id === 'itrc-booth';
        return (
          <Html
            key={label.id}
            position={[label.x, label.y, label.z]}
            center
            distanceFactor={9}
            sprite
            transform
            occlude
            zIndexRange={[6, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className={
                isItrcBooth
                  ? 'map3d-category-label map3d-category-label--itrc-booth'
                  : label.icon
                  ? 'map3d-special-label map3d-special-label--feature'
                  : `map3d-special-label map3d-special-label--entrance ${
                    label.id === 'entrance' || label.id === 'exit' ? 'map3d-special-label--venue-gate' : ''
                  }`
              }
              style={
                isItrcBooth
                  ? {
                      '--cat-bg': '#b8dea1',
                      '--cat-text': '#ffffff',
                      '--cat-border': 'rgba(74, 124, 74, 0.22)',
                    }
                  : undefined
              }
            >
              {isItrcBooth ? (
                label.label
              ) : label.icon ? (
                <>
                  <div className="map3d-special-label-badge">
                    <img className="map3d-special-label-icon" src={label.icon} alt="" aria-hidden="true" />
                  </div>
                  <span className="map3d-special-label-caption">{label.label}</span>
                </>
              ) : (
                <span
                  className={`map3d-special-label-entrance-text ${
                    label.id === 'entrance' || label.id === 'exit' ? 'map3d-special-label-venue-gate-text' : ''
                  }`}
                >
                  {label.label}
                </span>
              )}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function BoothFloorLabels({ boothPositions }) {
  const labels = useMemo(() => {
    return booths
      .map((booth) => {
        const point = boothPositions[booth.id];
        if (!point) {
          return null;
        }

        const category = CATEGORY_LOOKUP.get(booth.category);
        return {
          id: booth.id,
          title: booth.name,
          x: point[0],
          z: point[1],
          color: category?.color ?? '#2e6f9f',
        };
      })
      .filter(Boolean);
  }, [boothPositions]);

  return (
    <group>
      {labels.map((label) => (
        <group
          key={label.id}
          position={[label.x, 0.12, label.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <Html
            transform
            occlude={false}
            zIndexRange={[2, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="map3d-booth-floor-label"
              style={{ '--booth-floor-accent': label.color }}
            >
              {label.title}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function OccludedBoothNameLabels({ boothPositions, visible = true }) {
  const labels = useMemo(() => {
    if (!visible) {
      return [];
    }

    return booths
      .map((booth) => {
        const point = boothPositions[booth.id];
        if (!point) {
          return null;
        }

        return {
          id: booth.id,
          title: booth.name,
          x: point[0],
          z: point[1],
        };
      })
      .filter(Boolean);
  }, [boothPositions, visible]);

  if (!visible || labels.length === 0) {
    return null;
  }

  return (
    <group>
      {labels.map((label) => (
        <Html
          key={label.id}
          position={[label.x, 2.4, label.z]}
          center
          distanceFactor={10}
          sprite
          transform
          occlude
          zIndexRange={[4, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="map3d-booth-name-label">{label.title}</div>
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
  const highlightRef = useRef();
  const pulse = useRef(0);
  const position = getBoothPosition(booth, boothPositions);

  useFrame((_, delta) => {
    if (!highlightRef.current) {
      return;
    }

    pulse.current += delta * 3;
    const mesh = highlightRef.current;
    const pulseValue = 0.5 + 0.5 * Math.sin(pulse.current);
    mesh.material.opacity = booth
      ? 0.28 + 0.22 * pulseValue
      : Math.max(0, mesh.material.opacity - 0.05);
    const scaleX = booth ? 1.02 + 0.08 * pulseValue : 1;
    const scaleY = booth ? 1.01 + 0.05 * pulseValue : 1;
    mesh.scale.set(scaleX, scaleY, 1);
  });

  return (
    <mesh
      ref={highlightRef}
      raycast={NO_RAYCAST}
      position={position ? [position[0], 0.055, position[1]] : [0, -999, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={18}
    >
      <planeGeometry args={[3.2, 5.8]} />
      <meshBasicMaterial
        color={0xffd84d}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function CurrentLocationMarker({ routeStartPoint }) {
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
    <group position={routeStartPoint ? [routeStartPoint[0], 0.05, routeStartPoint[2]] : [0, -999, 0]}>
      <mesh ref={outerRef} raycast={NO_RAYCAST} rotation={[-Math.PI / 2, 0, 0]} renderOrder={18}>
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial color={0xc21875} transparent opacity={0.52} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={innerRef} raycast={NO_RAYCAST} rotation={[-Math.PI / 2, 0, 0]} renderOrder={19}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color={0xe83d97} transparent opacity={0.96} depthWrite={false} />
      </mesh>
      <group ref={arrowRef} position={[0, 1.08, 0]} renderOrder={19}>
        <mesh raycast={NO_RAYCAST} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.44, 0.86, 24]} />
          <meshStandardMaterial
            color={0xff6ab9}
            emissive={0xe83d97}
            emissiveIntensity={0.78}
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
            color={0xffd84d}
            transparent
            opacity={0.34}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {targetPoint2D && (
        <>
          <mesh
            raycast={NO_RAYCAST}
            position={[targetPoint2D[0], 0.031, targetPoint2D[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={13}
          >
            <circleGeometry args={[0.23, 24]} />
            <meshBasicMaterial
              color={0xf4b400}
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </mesh>
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
              opacity={0.9}
              depthWrite={false}
              side={THREE.DoubleSide}
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
  }, [boothPositions, targetBoothPos]);

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

function MapEnvironment() {
  const scene = useThree((state) => state.scene);
  const exrTexture = useLoader(EXRLoader, EXR_ENV_URL);

  useEffect(() => {
    const previousBackground = scene.background;
    const previousEnvironment = scene.environment;

    exrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = new THREE.Color(0xdadada);
    scene.environment = exrTexture;

    return () => {
      scene.background = previousBackground;
      scene.environment = previousEnvironment;
    };
  }, [exrTexture, scene]);

  return null;
}

function SceneReadyNotifier({ onReady }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (typeof onReady !== 'function') {
      return undefined;
    }

    let cancelled = false;
    let firstFrameId = 0;
    let secondFrameId = 0;
    let thirdFrameId = 0;

    const prepareScene = async () => {
      try {
        if (typeof gl.compileAsync === 'function') {
          await gl.compileAsync(scene, camera);
        } else if (typeof gl.compile === 'function') {
          gl.compile(scene, camera);
        }
      } catch {
        // Rendering warmup is best-effort only.
      }

      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(() => {
          thirdFrameId = window.requestAnimationFrame(() => {
            if (!cancelled) {
              onReady();
            }
          });
        });
      });
    };

    prepareScene();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
      window.cancelAnimationFrame(thirdFrameId);
    };
  }, [camera, gl, onReady, scene]);

  return null;
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
  showBoothLabels = true,
  kioskInfoPositions = {},
  currentKioskId = null,
  routeStartPoint = null,
  onSceneReady = null,
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

    const startPoint = routeStartPoint ?? ENTRANCE;
    const startCell = findNearestWalkable(
      worldToCell(startPoint[0], startPoint[2], navmeshGrid),
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
  }, [boothFrontPositions, boothPositions, navmeshGrid, pathPoints, resolvedPathCache, routeStartPoint, selectedBooth]);

  return (
    <>
      <SceneReadyNotifier onReady={onSceneReady} />
      <MapEnvironment />
      <hemisphereLight args={[0xffffff, 0xaaaaaa, 0.8]} />
      <directionalLight color={0xffffff} intensity={1.5} position={[20, 40, 20]} />

      {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color={0xd8e8f4} />
      </mesh> */}

      <KioskMapModel />
      <BoothHitAreas onHover={handleHover} onSelect={handleSelect} boothPositions={boothPositions} />
      <OccludedBoothNameLabels boothPositions={boothPositions} visible={showBoothLabels} />
      <CategoryLabels kioskInfoPositions={kioskInfoPositions} />
      <VenueFeatureLabels
        kioskInfoPositions={kioskInfoPositions}
        currentKioskId={currentKioskId}
      />
      <SelectionRing booth={selectedBooth} boothPositions={boothPositions} />
      <CurrentLocationMarker routeStartPoint={routeStartPoint} />
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

KIOSK_DISPLAY_MODEL_PATHS.forEach((path) => {
  useGLTF.preload(path);
});
useGLTF.preload(EVENT_BOOTHS_CARPET_MODEL_PATH);
useGLTF.preload('/models/KioskBoothArea.glb');
