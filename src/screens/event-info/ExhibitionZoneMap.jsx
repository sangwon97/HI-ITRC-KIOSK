import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { loadExhibitionCenterEntries } from '../../data/exhibitionCenterAssets';
import { booths, categories, resolveBoothCategory } from '../../data/booths';

const BOOTH_NAME_RE = /^Floor_(S\d+B\d+)$/i;
const CATEGORY_ALL_ID = 'all';
const MAP_ROTATION_Y = Math.PI * 0.5;
const CATEGORY_COLOR_BY_ID = new Map(categories.map((category) => [category.id, category.color]));

function extractBoothId(name = '') {
  const match = name.match(BOOTH_NAME_RE);
  return match?.[1]?.toUpperCase() ?? null;
}

function rotateXZ(point) {
  const vector = new THREE.Vector3(point[0], 0, point[1]);
  vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), MAP_ROTATION_Y);
  return [vector.x, vector.z];
}

function buildBoundsFromPoints(points, padding = 0) {
  const xs = points.map((point) => point[0]);
  const zs = points.map((point) => point[1]);

  return {
    minX: Math.min(...xs) - padding,
    maxX: Math.max(...xs) + padding,
    minZ: Math.min(...zs) - padding,
    maxZ: Math.max(...zs) + padding,
  };
}

function expandBounds(bounds, padding = 0) {
  return {
    minX: bounds.minX - padding,
    maxX: bounds.maxX + padding,
    minZ: bounds.minZ - padding,
    maxZ: bounds.maxZ + padding,
  };
}

function normalizeBounds(bounds, minSpan = 14) {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) * 0.5;
  const centerZ = (bounds.minZ + bounds.maxZ) * 0.5;
  const normalizedWidth = Math.max(width, minSpan);
  const normalizedDepth = Math.max(depth, minSpan);

  return {
    minX: centerX - normalizedWidth * 0.5,
    maxX: centerX + normalizedWidth * 0.5,
    minZ: centerZ - normalizedDepth * 0.5,
    maxZ: centerZ + normalizedDepth * 0.5,
  };
}

function boundsOverlap(a, b) {
  return (
    a.minX < b.maxX
    && a.maxX > b.minX
    && a.minZ < b.maxZ
    && a.maxZ > b.minZ
  );
}

function resolveZoneBoundsOverlap(rawZones) {
  return rawZones.reduce((resolved, zone) => {
    const nextBounds = { ...zone.bounds };
    const minWidth = zone.minWidth;
    const minDepth = zone.minDepth;

    for (const existing of resolved) {
      let guard = 0;
      while (boundsOverlap(nextBounds, existing.bounds) && guard < 10) {
        const overlapX = Math.min(nextBounds.maxX, existing.bounds.maxX) - Math.max(nextBounds.minX, existing.bounds.minX);
        const overlapZ = Math.min(nextBounds.maxZ, existing.bounds.maxZ) - Math.max(nextBounds.minZ, existing.bounds.minZ);
        const currentWidth = nextBounds.maxX - nextBounds.minX;
        const currentDepth = nextBounds.maxZ - nextBounds.minZ;

        if (overlapX <= overlapZ && currentWidth - overlapX - 0.4 >= minWidth) {
          nextBounds.minX += overlapX * 0.5 + 0.2;
          nextBounds.maxX -= overlapX * 0.5 + 0.2;
        } else if (currentDepth - overlapZ - 0.4 >= minDepth) {
          nextBounds.minZ += overlapZ * 0.5 + 0.2;
          nextBounds.maxZ -= overlapZ * 0.5 + 0.2;
        } else {
          break;
        }

        guard += 1;
      }
    }

    resolved.push({
      ...zone,
      bounds: nextBounds,
    });
    return resolved;
  }, []);
}

function TopDownMapCamera({ bounds }) {
  const { camera, size } = useThree();
  const currentBoundsRef = useRef(null);

  useEffect(() => {
    if (!bounds) {
      return;
    }

    if (!currentBoundsRef.current) {
      currentBoundsRef.current = { ...bounds };
    }
  }, [bounds]);

  useFrame((_, delta) => {
    if (!bounds || !camera.isOrthographicCamera) {
      return;
    }

    if (!currentBoundsRef.current) {
      currentBoundsRef.current = { ...bounds };
    }

    const alpha = 1 - Math.exp(-delta * 4.5);
    currentBoundsRef.current.minX += (bounds.minX - currentBoundsRef.current.minX) * alpha;
    currentBoundsRef.current.maxX += (bounds.maxX - currentBoundsRef.current.maxX) * alpha;
    currentBoundsRef.current.minZ += (bounds.minZ - currentBoundsRef.current.minZ) * alpha;
    currentBoundsRef.current.maxZ += (bounds.maxZ - currentBoundsRef.current.maxZ) * alpha;

    const width = currentBoundsRef.current.maxX - currentBoundsRef.current.minX;
    const depth = currentBoundsRef.current.maxZ - currentBoundsRef.current.minZ;
    const centerX = (currentBoundsRef.current.minX + currentBoundsRef.current.maxX) * 0.5;
    const centerZ = (currentBoundsRef.current.minZ + currentBoundsRef.current.maxZ) * 0.5;
    const aspect = size.width / Math.max(size.height, 1);
    const frustumHeight = Math.max(depth, width / Math.max(aspect, 0.1));
    const frustumWidth = frustumHeight * aspect;

    camera.left = -frustumWidth * 0.5;
    camera.right = frustumWidth * 0.5;
    camera.top = frustumHeight * 0.5;
    camera.bottom = -frustumHeight * 0.5;
    camera.near = 1;
    camera.far = 400;
    camera.position.set(centerX, 120, centerZ);
    camera.up.set(0, 0, -1);
    camera.lookAt(centerX, 0, centerZ);
    camera.updateProjectionMatrix();
  });

  return null;
}

function FlatMapModel({ cameraBounds }) {
  const { scene } = useGLTF('/models/Map_Kiosk.glb');

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (!node.isMesh) {
        return;
      }

      node.raycast = () => null;
      if (node.material?.clone) {
        node.material = node.material.clone();
      }
    });
    return clone;
  }, [scene]);

  return (
    <>
      <TopDownMapCamera bounds={cameraBounds} />
      <primitive object={model} rotation={[0, MAP_ROTATION_Y, 0]} />
    </>
  );
}

function FloorCategoryOverlay({ categoryZones, selectedCategoryId }) {
  return (
    <group>
      {categoryZones.map((zone) => {
        const isSelected = selectedCategoryId !== CATEGORY_ALL_ID && selectedCategoryId === zone.categoryId;
        const isDimmed = selectedCategoryId !== CATEGORY_ALL_ID && !isSelected;
        const opacity = isSelected ? 0.34 : isDimmed ? 0.1 : 0.18;

        return (
          <mesh
            key={zone.categoryId}
            position={[zone.centerX, 0.05, zone.centerZ]}
            rotation={[-Math.PI * 0.5, 0, 0]}
            renderOrder={2}
          >
            <planeGeometry args={[zone.width, zone.depth]} />
            <meshBasicMaterial
              color={zone.color}
              transparent
              opacity={opacity}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function BoothLogoMarkers({ markers, activeMarkerId, onSelectMarker }) {
  return (
    <group>
      {markers.map((marker) => (
        <Html
          key={marker.id}
          position={[marker.position[0], 0.2, marker.position[1]]}
          center
          transform
          sprite
          distanceFactor={24}
          occlude={false}
          zIndexRange={[6, 0]}
          style={{
            pointerEvents: 'auto',
            zIndex: marker.id === activeMarkerId ? 4 : 1,
          }}
        >
          <button
            type="button"
            className={`is-zone-marker ${marker.id === activeMarkerId ? 'is-zone-marker-active' : ''}`}
            onClick={() => onSelectMarker(marker.id === activeMarkerId ? null : marker)}
          >
            <div className={`is-zone-marker-logo ${marker.id === activeMarkerId ? 'is-zone-marker-logo-active' : ''}`}>
              <img
                src={marker.logoSrc}
                alt={`${marker.title} 로고`}
                loading="lazy"
              />
            </div>
          </button>
        </Html>
      ))}
    </group>
  );
}

function ActiveMarkerCard({ marker, onClose }) {
  if (!marker) {
    return null;
  }

  return (
    <div className="is-zone-detail-card">
      <button
        type="button"
        className="is-zone-detail-close"
        onClick={onClose}
        aria-label="센터 정보 닫기"
      >
        ×
      </button>
      <div className="is-zone-detail-logo">
        <img src={marker.logoSrc} alt={`${marker.title} 로고`} loading="lazy" />
      </div>
      <div className="is-zone-detail-copy">
        <div className="is-zone-detail-university">{marker.university}</div>
        <div className="is-zone-detail-title">{marker.title}</div>
      </div>
    </div>
  );
}

export default function ExhibitionZoneMap() {
  const { scene: mapScene } = useGLTF('/models/Map_Kiosk.glb');
  const { scene: boothAreaScene } = useGLTF('/models/KioskBoothArea.glb');
  const [entries, setEntries] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(CATEGORY_ALL_ID);
  const [activeMarker, setActiveMarker] = useState(null);

  const boothDots = useMemo(() => {
    const clone = boothAreaScene.clone(true);
    const box = new THREE.Box3();
    const center = new THREE.Vector3();
    const dots = [];

    clone.updateMatrixWorld(true);
    clone.traverse((node) => {
      if (!node.isMesh) {
        return;
      }

      const boothId = extractBoothId(node.name);
      if (!boothId) {
        return;
      }

      box.setFromObject(node);
      box.getCenter(center);
      dots.push({
        id: boothId,
        position: rotateXZ([center.x, center.z]),
      });
    });

    return dots;
  }, [boothAreaScene]);

  useEffect(() => {
    let cancelled = false;

    loadExhibitionCenterEntries().then((nextEntries) => {
      if (!cancelled) {
        setEntries(nextEntries);
      }
    }).catch(() => {
      if (!cancelled) {
        setEntries([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const markers = useMemo(() => {
    const entryMap = new Map(entries.map((entry) => [entry.boothId, entry]));
    return boothDots
      .map((dot) => {
        const entry = entryMap.get(dot.id);
        if (!entry) {
          return null;
        }

        return {
          id: dot.id,
          position: dot.position,
          title: entry.title,
          university: entry.university,
          logoSrc: entry.logoSrc,
          categoryId: entry.categoryId,
        };
      })
      .filter(Boolean);
  }, [boothDots, entries]);

  const categoryZones = useMemo(() => {
    const boothCategoryById = new Map(
      booths.map((booth) => [booth.id, resolveBoothCategory(booth) ?? booth.category]),
    );
    const grouped = boothDots.reduce((map, dot) => {
      const categoryId = boothCategoryById.get(dot.id);
      if (!categoryId) {
        return map;
      }

      const current = map.get(categoryId) ?? [];
      current.push(dot.position);
      map.set(categoryId, current);
      return map;
    }, new Map());

    const rawZones = [...grouped.entries()].map(([categoryId, points]) => {
      const bounds = buildBoundsFromPoints(points);
      const minWidth = categoryId === 'ict_industry' ? 10 : 8;
      const minDepth = categoryId === 'ict_industry' ? 16 : 10;
      const expandedBounds = normalizeBounds(expandBounds(bounds, 1.8), Math.min(minWidth, minDepth));

      return {
        categoryId,
        bounds: expandedBounds,
        minWidth,
        minDepth,
        color: CATEGORY_COLOR_BY_ID.get(categoryId) ?? '#d9dee8',
      };
    });

    return resolveZoneBoundsOverlap(rawZones).map((zone) => ({
      categoryId: zone.categoryId,
      centerX: (zone.bounds.minX + zone.bounds.maxX) * 0.5,
      centerZ: (zone.bounds.minZ + zone.bounds.maxZ) * 0.5,
      width: zone.bounds.maxX - zone.bounds.minX,
      depth: zone.bounds.maxZ - zone.bounds.minZ,
      bounds: zone.bounds,
      color: zone.color,
    }));
  }, [boothDots]);

  const mapBounds = useMemo(() => {
    const clone = mapScene.clone(true);
    clone.rotation.y = MAP_ROTATION_Y;
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) {
      return boothDots.length
        ? buildBoundsFromPoints(boothDots.map((dot) => dot.position), 2)
        : null;
    }

    return {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
    };
  }, [boothDots, mapScene]);

  const categoryTabs = useMemo(() => {
    const counts = markers.reduce((map, marker) => {
      map.set(marker.categoryId, (map.get(marker.categoryId) ?? 0) + 1);
      return map;
    }, new Map());

    return [
      { id: CATEGORY_ALL_ID, label: '전체', color: '#2e6f9f', count: markers.length },
      ...categories
        .filter((category) => counts.has(category.id))
        .map((category) => ({
          id: category.id,
          label: category.label,
          color: category.color,
          count: counts.get(category.id) ?? 0,
        })),
    ];
  }, [markers]);

  useEffect(() => {
    if (!categoryTabs.length) {
      return;
    }

    setSelectedCategoryId((current) => {
      if (current && categoryTabs.some((tab) => tab.id === current)) {
        return current;
      }
      return CATEGORY_ALL_ID;
    });
  }, [categoryTabs]);

  const visibleMarkers = useMemo(() => {
    if (selectedCategoryId === CATEGORY_ALL_ID) {
      return markers;
    }

    return markers.filter((marker) => marker.categoryId === selectedCategoryId);
  }, [markers, selectedCategoryId]);

  useEffect(() => {
    if (!activeMarker) {
      return;
    }

    const stillVisible = visibleMarkers.some((marker) => marker.id === activeMarker.id);
    if (!stillVisible) {
      setActiveMarker(null);
    }
  }, [activeMarker, visibleMarkers]);

  const cameraBounds = useMemo(() => {
    if (activeMarker) {
      const activeZone = categoryZones.find((zone) => zone.categoryId === activeMarker.categoryId);
      if (activeZone) {
        return normalizeBounds(expandBounds(activeZone.bounds, 3.6), 18);
      }

      return normalizeBounds(
        buildBoundsFromPoints([activeMarker.position], 8.4),
        14,
      );
    }

    if (selectedCategoryId !== CATEGORY_ALL_ID) {
      const selectedZone = categoryZones.find((zone) => zone.categoryId === selectedCategoryId);
      if (selectedZone) {
        return normalizeBounds(expandBounds(selectedZone.bounds, 3.6), 18);
      }
    }

    if (!visibleMarkers.length) {
      return mapBounds;
    }

    return normalizeBounds(
      expandBounds(buildBoundsFromPoints(visibleMarkers.map((marker) => marker.position)), 3.2),
      16,
    );
  }, [activeMarker, categoryZones, mapBounds, selectedCategoryId, visibleMarkers]);

  const handleSelectCategory = (nextCategoryId) => {
    if (nextCategoryId === selectedCategoryId && nextCategoryId !== CATEGORY_ALL_ID) {
      setSelectedCategoryId(CATEGORY_ALL_ID);
      return;
    }
    setSelectedCategoryId(nextCategoryId);
  };

  const handleSelectMarker = (nextMarker) => {
    setActiveMarker(nextMarker);

    if (nextMarker?.categoryId) {
      setSelectedCategoryId(nextMarker.categoryId);
      return;
    }

    setSelectedCategoryId(CATEGORY_ALL_ID);
  };

  const mapBoardStyle = useMemo(() => {
    if (!cameraBounds) {
      return undefined;
    }

    const width = cameraBounds.maxX - cameraBounds.minX;
    const height = cameraBounds.maxZ - cameraBounds.minZ;

    return {
      '--zone-map-aspect': `${height / width}`,
    };
  }, [cameraBounds]);

  return (
    <div className="is-zone-layout">
      <aside className="is-zone-category-panel">
        <div className="is-zone-category-tabs">
          {categoryTabs.map((tab) => {
            const whiteCategory = tab.color.toLowerCase() === '#ffffff';
            return (
              <button
                key={tab.id}
                type="button"
                className={`is-zone-category-tab ${selectedCategoryId === tab.id ? 'is-zone-category-tab-active' : ''}`}
                style={{
                  '--zone-tab-color': tab.color,
                  '--zone-tab-active-color': whiteCategory ? '#101820' : tab.color,
                }}
                onClick={() => handleSelectCategory(tab.id)}
              >
                <span className="is-zone-category-tab-label">{tab.label}</span>
                <span className="is-zone-category-tab-count">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="is-zone-stage">
        <div className="is-zone-map-board" style={mapBoardStyle}>
          <div className="is-zone-map-hint">로고를 클릭하면 센터명을 볼 수 있어요</div>
          <ActiveMarkerCard marker={activeMarker} onClose={() => handleSelectMarker(null)} />
          <Canvas orthographic dpr={[1, 1.5]} className="is-zone-map-canvas" gl={{ alpha: true }}>
            <Suspense fallback={null}>
              <ambientLight intensity={1.25} />
              <directionalLight position={[30, 80, 20]} intensity={1.35} />
              <directionalLight position={[-28, 64, -20]} intensity={0.45} />
              <FlatMapModel cameraBounds={cameraBounds} />
              <FloorCategoryOverlay
                categoryZones={categoryZones}
                selectedCategoryId={selectedCategoryId}
              />
              <BoothLogoMarkers
                markers={visibleMarkers}
                activeMarkerId={activeMarker?.id ?? null}
                onSelectMarker={handleSelectMarker}
              />
            </Suspense>
          </Canvas>
        </div>
      </section>
    </div>
  );
}

useGLTF.preload('/models/Map_Kiosk.glb');
useGLTF.preload('/models/KioskBoothArea.glb');
