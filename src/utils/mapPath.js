import { boothPositions } from '../data/boothPositions';

// 입구 위치 (전시장 하단 중앙)
export const ENTRANCE = [0, 0, -42];

// 복도 X 좌표
const CX_LEFT   = -12.5; // S8/S9/S10 ↔ S1-S4 사이
const CX_CENTER =  5.0;  // S1-S4 ↔ S5-S7 사이
const CX_RIGHT  = 22.5;  // S5-S7 우측

// 바닥 수평 복도 Z
const CZ_BOTTOM = -37;

const Y = 0.15; // 바닥 위 약간

/**
 * 입구에서 부스까지 복도를 따라가는 경로 포인트를 반환합니다.
 * @param {string} boothId
 * @returns {[number,number,number][]|null} [[x,y,z], ...] 배열
 */
export function computeBoothPath(boothId) {
  const pos = boothPositions[boothId];
  if (!pos) return null;

  const [bx, bz] = pos;

  // 입구 → 하단 복도 진입점
  const path = [
    [0,   Y, -42],
    [0,   Y, CZ_BOTTOM],
  ];

  // bx 기준으로 사용할 세로 복도 결정
  let corridorX;
  if (bx < -5) {
    // S8/S9/S10 or S1-S4 외곽 좌측 부스 → 왼쪽 복도
    corridorX = CX_LEFT;
  } else if (bx < 8) {
    // S1-S4 중앙 부스 → 오른쪽에서 우회
    corridorX = CX_CENTER;
  } else if (bx < 16) {
    // S5-S7 좌측 부스 → 중앙 복도
    corridorX = CX_CENTER;
  } else {
    // S5-S7 우측 부스 → 우측 복도
    corridorX = CX_RIGHT;
  }

  // 하단 → 세로 복도 입구
  path.push([corridorX, Y, CZ_BOTTOM]);
  // 세로 복도 따라 부스 Z까지 이동
  path.push([corridorX, Y, bz]);
  // 부스 쪽으로 꺾기
  path.push([bx, Y, bz]);

  return path;
}

/**
 * 경로 포인트 배열에서 누적 거리(t=0~1) 기준 보간 위치와 방향 반환
 */
export function samplePath(points, t) {
  if (!points || points.length < 2) return { pos: [0, 0, 0], dir: [1, 0, 0] };

  // 구간별 거리 계산
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay, az] = points[i - 1];
    const [bx, by, bz] = points[i];
    const d = Math.sqrt((bx-ax)**2 + (by-ay)**2 + (bz-az)**2);
    dists.push(dists[i - 1] + d);
  }
  const total = dists[dists.length - 1];
  const target = Math.min(t, 1) * total;

  // 해당 구간 찾기
  let seg = 0;
  for (let i = 1; i < dists.length; i++) {
    if (dists[i] >= target) { seg = i - 1; break; }
  }

  const segLen = dists[seg + 1] - dists[seg];
  const localT  = segLen > 0 ? (target - dists[seg]) / segLen : 0;

  const [ax, ay, az] = points[seg];
  const [bx, by, bz] = points[seg + 1] ?? points[seg];
  return {
    pos: [ax + (bx - ax) * localT, ay + (by - ay) * localT, az + (bz - az) * localT],
    dir: [bx - ax, by - ay, bz - az],
  };
}
