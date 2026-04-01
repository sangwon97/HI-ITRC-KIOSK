import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Line } from '@react-three/drei';
import * as THREE from 'three';

import { booths } from '../data/booths';
import { boothPositions, sectionZones } from '../data/boothPositions';
import { ENTRANCE, computeBoothPath } from '../utils/mapPath';

// ── 부스 당 회전 & 시각 중심 사전 계산 ────────────────────────
// Booth01SingleA: X[-2.933,0], Z[-5.494,0] → XZ 중심 = (-1.467, -2.747)
const BOOTH_HALF_W = 1.467; // 2.933 / 2
const BOOTH_HALF_D = 2.747; // 5.494 / 2

function computeBoothData(positions) {
  const entries = Object.entries(positions);
  const data = {};
  for (const [id, [x, z]] of entries) {
    // 같은 Z(±0.1), X 간격 0.4–2.5인 부스를 파트너로 탐색
    const partner = entries.find(([bid, [px, pz]]) =>
      bid !== id &&
      Math.abs(pz - z) < 0.1 &&
      Math.abs(px - x) > 0.4 &&
      Math.abs(px - x) < 2.5
    );
    let rotation;
    if (partner) {
      // 파트너 쌍: 높은 X → 180° 회전
      rotation = x > partner[1][0] ? Math.PI : 0;
    } else {
      // 단독 측면 열: X < 15 → 홀 중심을 향해 180° 회전
      rotation = x < 15 ? Math.PI : 0;
    }
    // 시각적 중심 (SelectionRing / HoverHighlight 위치)
    const cx = rotation === 0 ? x - BOOTH_HALF_W : x + BOOTH_HALF_W;
    const cz = rotation === 0 ? z - BOOTH_HALF_D : z + BOOTH_HALF_D;
    data[id] = { rotation, cx, cz };
  }
  return data;
}

const BOOTH_DATA = computeBoothData(boothPositions);

// ── Walls GLB (천장·조명 숨김) ───────────────────────────────
function WallsModel() {
  const { scene } = useGLTF('/models/Walls.glb');
  const filtered = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(node => {
      if (!node.isMesh) return;
      const n = node.name.toLowerCase();
      if (n.includes('ceiling') || n.includes('roof') || n.includes('light')) {
        node.visible = false;
      }
    });
    return clone;
  }, [scene]);
  return <primitive object={filtered} />;
}

// ── Carpet GLB (천장·조명 노드 숨김) ─────────────────────────
function CarpetModel() {
  const { scene } = useGLTF('/models/Carpet.glb');
  const filtered = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(node => {
      if (!node.isMesh) return;
      const n = node.name.toLowerCase();
      if (n.includes('ceiling') || n.includes('roof') || n.includes('light')) {
        node.visible = false;
      }
    });
    return clone;
  }, [scene]);
  return <primitive object={filtered} position={[0, 0.005, 0]} />;
}

// ── Booth_Base.glb + Booth_Panel.glb → 부스 렌더링 ──────────
// Booth_Base: Booth01SingleA + BlueCarpet
// Booth_Panel: NamePanelHorizontal + NamePanelVertical (이름 패널)
// 천장 계열 노드(ceiling/roof/light) 제외
function useBoothParts() {
  const { scene: baseScene  } = useGLTF('/models/Booth_Base.glb');
  const { scene: panelScene } = useGLTF('/models/Booth_Panel.glb');

  return useMemo(() => {
    let mainGeo = null, mainMat = null;
    let carpetGeo = null, carpetMat = null;
    baseScene.traverse(node => {
      if (!node.isMesh) return;
      if (node.name === 'Booth01SingleA') {
        mainGeo = node.geometry; mainMat = node.material;
      } else if (node.name === 'BlueCarpet') {
        carpetGeo = node.geometry; carpetMat = node.material;
      }
    });

    let panelHGeo = null, panelHMat = null;
    let panelVGeo = null, panelVMat = null;
    panelScene.traverse(node => {
      if (!node.isMesh) return;
      if (node.name === 'NamePanelHorizontal') {
        panelHGeo = node.geometry; panelHMat = node.material;
      } else if (node.name === 'NamePanelVertical') {
        panelVGeo = node.geometry; panelVMat = node.material;
      }
    });

    if (!mainGeo)   mainGeo   = new THREE.BoxGeometry(2.933, 3, 5.494);
    if (!mainMat)   mainMat   = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    if (!carpetGeo) carpetGeo = new THREE.PlaneGeometry(2.929, 5.494);
    if (!carpetMat) carpetMat = new THREE.MeshStandardMaterial({ color: 0x4488cc });
    if (!panelHGeo) panelHGeo = new THREE.PlaneGeometry(0.001, 0.001);
    if (!panelHMat) panelHMat = new THREE.MeshStandardMaterial({ visible: false });
    if (!panelVGeo) panelVGeo = new THREE.PlaneGeometry(0.001, 0.001);
    if (!panelVMat) panelVMat = new THREE.MeshStandardMaterial({ visible: false });

    return { mainGeo, mainMat, carpetGeo, carpetMat, panelHGeo, panelHMat, panelVGeo, panelVMat };
  }, [baseScene, panelScene]);
}

// ── 부스 인스턴스드 메시 ──────────────────────────────────────
function BoothInstances({ onHover, onSelect }) {
  const { mainGeo, mainMat, carpetGeo, carpetMat,
          panelHGeo, panelHMat, panelVGeo, panelVMat } = useBoothParts();

  const boothList = useMemo(
    () => booths.filter(b => boothPositions[b.id]),
    []
  );

  const mainRef   = useRef();
  const carpetRef = useRef();
  const panelHRef = useRef();
  const panelVRef = useRef();
  const dummy     = useMemo(() => new THREE.Object3D(), []);

  // 인스턴스 행렬 초기화
  useEffect(() => {
    if (!mainRef.current || !carpetRef.current) return;
    if (!panelHRef.current || !panelVRef.current) return;
    boothList.forEach((b, i) => {
      const [x, z] = boothPositions[b.id];
      const { rotation } = BOOTH_DATA[b.id];

      // 부스 본체 + 이름 패널 (Y=0, 동일 트랜스폼)
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mainRef.current.setMatrixAt(i, dummy.matrix);
      panelHRef.current.setMatrixAt(i, dummy.matrix);
      panelVRef.current.setMatrixAt(i, dummy.matrix);

      // 카펫 (z-fighting 방지를 위해 Y=0.01)
      dummy.position.set(x, 0.01, z);
      dummy.updateMatrix();
      carpetRef.current.setMatrixAt(i, dummy.matrix);
    });
    mainRef.current.instanceMatrix.needsUpdate   = true;
    carpetRef.current.instanceMatrix.needsUpdate = true;
    panelHRef.current.instanceMatrix.needsUpdate = true;
    panelVRef.current.instanceMatrix.needsUpdate = true;
  }, [boothList, dummy]);

  // 호버 상태 (시각 피드백용)
  const [hoveredBooth, setHoveredBooth] = useState(null);
  const prevHoverRef = useRef(null);

  const handleMove = useCallback(e => {
    e.stopPropagation();
    const booth = boothList[e.instanceId];
    if (!booth || booth.id === prevHoverRef.current) return;
    prevHoverRef.current = booth.id;
    setHoveredBooth(booth);
    onHover(booth);
  }, [boothList, onHover]);

  const handleOut = useCallback(() => {
    prevHoverRef.current = null;
    setHoveredBooth(null);
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(e => {
    e.stopPropagation();
    const booth = boothList[e.instanceId];
    if (booth) onSelect(booth);
  }, [boothList, onSelect]);

  return (
    <group>
      {/* 호버 하이라이트 */}
      <HoverHighlight booth={hoveredBooth} />

      {/* 부스 본체 — 이벤트 처리 */}
      <instancedMesh
        ref={mainRef}
        args={[mainGeo, mainMat, boothList.length]}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onClick={handleClick}
      />

      {/* 바닥 카펫 — 이벤트 없음 */}
      <instancedMesh
        ref={carpetRef}
        args={[carpetGeo, carpetMat, boothList.length]}
      />

      {/* 이름 패널 (Booth_Panel.glb) — 이벤트 없음 */}
      <instancedMesh ref={panelHRef} args={[panelHGeo, panelHMat, boothList.length]} />
      <instancedMesh ref={panelVRef} args={[panelVGeo, panelVMat, boothList.length]} />
    </group>
  );
}

// ── 호버 하이라이트 ───────────────────────────────────────────
function HoverHighlight({ booth }) {
  const data = booth ? BOOTH_DATA[booth.id] : null;
  return (
    <mesh
      position={data ? [data.cx, 0.05, data.cz] : [0, -999, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[3.2, 5.8]} />
      <meshBasicMaterial
        color={0x00c4ff}
        transparent
        opacity={0.22}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── 선택 링 ──────────────────────────────────────────────────
function SelectionRing({ booth }) {
  const ringRef = useRef();
  const pulse   = useRef(0);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    pulse.current += delta * 3;
    ringRef.current.material.opacity = booth
      ? 0.5 + 0.35 * Math.sin(pulse.current)
      : Math.max(0, ringRef.current.material.opacity - 0.05);
  });

  const data = booth ? BOOTH_DATA[booth.id] : null;

  return (
    <mesh
      ref={ringRef}
      position={data ? [data.cx, 0.08, data.cz] : [0, -999, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[2.4, 2.9, 32]} />
      <meshBasicMaterial
        color={0x00b4ff}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── 입구 마커 ─────────────────────────────────────────────────
function EntranceMarker() {
  const outerRef = useRef();
  const innerRef = useRef();
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
  });

  return (
    <group position={[ENTRANCE[0], 0.05, ENTRANCE[2]]}>
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial color={0x00ffaa} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color={0x00ffaa} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 1.0, 16]} />
        <meshBasicMaterial color={0x00ffaa} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ── 경로 가이드 ───────────────────────────────────────────────
function PathGuide({ pathPoints }) {
  const lineRef = useRef();

  const arrowGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.4, 1.0, 8);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  const { arrowPositions, arrowRotations } = useMemo(() => {
    if (!pathPoints || pathPoints.length < 2) return { arrowPositions: [], arrowRotations: [] };
    const totalDist = pathPoints.reduce((acc, p, i) => {
      if (i === 0) return 0;
      const prev = pathPoints[i - 1];
      return acc + Math.sqrt((p[0]-prev[0])**2 + (p[1]-prev[1])**2 + (p[2]-prev[2])**2);
    }, 0);
    const step = 3.5;
    const count = Math.floor(totalDist / step);
    const positions = [], rotations = [];
    for (let k = 1; k <= count; k++) {
      const t = (k * step) / totalDist;
      const pos = interpolatePath(pathPoints, t);
      const posNext = interpolatePath(pathPoints, Math.min(t + 0.01, 1));
      const dx = posNext[0] - pos[0];
      const dz = posNext[2] - pos[2];
      positions.push(pos);
      rotations.push(Math.atan2(dx, dz));
    }
    return { arrowPositions: positions, arrowRotations: rotations };
  }, [pathPoints]);

  useFrame((_, delta) => {
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset -= delta * 3;
    }
  });

  if (!pathPoints || pathPoints.length < 2) return null;

  return (
    <group>
      <Line
        ref={lineRef}
        points={pathPoints}
        color="#00b4ff"
        lineWidth={4}
        dashed
        dashSize={1.2}
        gapSize={0.6}
      />
      {arrowPositions.map((pos, i) => (
        <mesh
          key={i}
          geometry={arrowGeo}
          position={[pos[0], pos[1] + 0.3, pos[2]]}
          rotation={[0, arrowRotations[i], 0]}
        >
          <meshBasicMaterial color={0x00b4ff} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function interpolatePath(points, t) {
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    const [ax, , az] = points[i - 1];
    const [bx, , bz] = points[i];
    dists.push(dists[i - 1] + Math.sqrt((bx-ax)**2 + (bz-az)**2));
  }
  const total = dists[dists.length - 1];
  const target = t * total;
  let seg = 0;
  for (let i = 1; i < dists.length; i++) {
    if (dists[i] >= target) { seg = i - 1; break; }
  }
  const segLen = dists[seg + 1] - dists[seg];
  const lt = segLen > 0 ? (target - dists[seg]) / segLen : 0;
  const [ax, ay, az] = points[seg];
  const [bx, by, bz] = points[Math.min(seg + 1, points.length - 1)];
  return [ax + (bx-ax)*lt, ay + (by-ay)*lt, az + (bz-az)*lt];
}

// ── 섹션 존 오버레이 ──────────────────────────────────────────
function SectionZones() {
  return (
    <>
      {sectionZones.map(z => (
        <group key={z.id}>
          <mesh position={[z.labelX, 0.06, z.labelZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[z.w, z.d]} />
            <meshBasicMaterial color={z.color} transparent opacity={0.13} depthWrite={false} />
          </mesh>
          <lineSegments position={[z.labelX, 0.07, z.labelZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <edgesGeometry args={[new THREE.PlaneGeometry(z.w, z.d)]} />
            <lineBasicMaterial color={z.color} transparent opacity={0.45} />
          </lineSegments>
        </group>
      ))}
    </>
  );
}

// ── 카메라 컨트롤러 ───────────────────────────────────────────
export function CameraController({ targetBoothPos, resetSignal, controlsRef }) {
  const lerpTarget = useRef(new THREE.Vector3(-3.5, 0, 0));

  useEffect(() => {
    if (targetBoothPos) {
      const data = BOOTH_DATA[targetBoothPos.id];
      if (data) lerpTarget.current.set(data.cx, 0, data.cz);
    }
  }, [targetBoothPos]);

  useEffect(() => {
    if (resetSignal > 0) {
      lerpTarget.current.set(-3.5, 0, 0);
    }
  }, [resetSignal]);

  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.target.lerp(lerpTarget.current, 0.07);
    ctrl.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={(Math.PI * 75) / 180}
      minDistance={15}
      maxDistance={100}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      panSpeed={0.8}
    />
  );
}

// ── 메인 씬 ──────────────────────────────────────────────────
export default function MapScene({
  onSelect,
  onHover,
  selectedBooth,
  pathPoints,
  controlsRef,
  resetSignal,
}) {
  const handleHover   = useCallback(booth => onHover(booth), [onHover]);
  const handleSelect  = useCallback(booth => onSelect(booth), [onSelect]);

  const targetBoothPos = selectedBooth || null;

  return (
    <>
      {/* 조명 */}
      <ambientLight color={0xe8f4ff} intensity={1.8} />
      <directionalLight color={0xffffff} intensity={0.6} position={[-8, 30, 15]} />

      {/* 전시장 외부 배경 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color={0xd8e8f4} />
      </mesh>

      {/* GLB 환경 모델 */}
      <CarpetModel />
      <WallsModel />

      {/* 섹션 존 */}
      <SectionZones />

      {/* 부스 — Booth_Base.glb InstancedMesh */}
      <BoothInstances
        onHover={handleHover}
        onSelect={handleSelect}
      />

      {/* 선택 링 */}
      <SelectionRing booth={selectedBooth} />

      {/* 입구 마커 */}
      <EntranceMarker />

      {/* 경로 가이드 */}
      <PathGuide pathPoints={pathPoints} />

      {/* 카메라 컨트롤 */}
      <CameraController
        targetBoothPos={targetBoothPos}
        resetSignal={resetSignal}
        controlsRef={controlsRef}
      />
    </>
  );
}

// 모델 사전 로드 (Floor.glb 삭제됨, CeilingPanels/WholeBooth 미사용)
useGLTF.preload('/models/Walls.glb');
useGLTF.preload('/models/Carpet.glb');
useGLTF.preload('/models/Booth_Base.glb');
useGLTF.preload('/models/Booth_Panel.glb');
