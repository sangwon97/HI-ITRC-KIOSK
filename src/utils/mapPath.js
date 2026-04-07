import { boothPositions } from '../data/boothPositions';
import { boothFrontPositions } from '../data/boothFrontPositions';

// 임시 스폰 위치
export const ENTRANCE = [8.8, 0, -8.4];

// 복도 X 좌표
const CX_LEFT   = -9.3; // 좌측 블록 ↔ 중앙 블록 사이
const CX_CENTER =  8.0; // 중앙 블록 ↔ 우측 블록 사이
const CX_RIGHT  = 26.0; // 우측 블록 바깥쪽 우회 복도

// 바닥 수평 복도 Z
const CZ_BOTTOM = 30.95;

const Y = 0.15; // 바닥 위 약간
const BOOTH_HALF_WIDTH = 1.38;
const BOOTH_ROUTE_MARGIN = 0.55;
const BOOTH_FRONT_X_INSET = 0.75;

function getCorridorXForBoothX(bx) {
  if (bx < -8) {
    return CX_LEFT;
  }

  if (bx < 8) {
    return CX_CENTER;
  }

  if (bx < 16) {
    return CX_CENTER;
  }

  return CX_RIGHT;
}

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
    [ENTRANCE[0], Y, ENTRANCE[2]],
    [ENTRANCE[0], Y, CZ_BOTTOM],
  ];

  // bx 기준으로 사용할 세로 복도 결정
  const corridorX = getCorridorXForBoothX(bx);

  const routePoint = getBoothRoutePoint(boothId);
  const targetX = routePoint?.[0] ?? bx;
  const targetZ = routePoint?.[1] ?? bz;

  // 하단 → 세로 복도 입구
  path.push([corridorX, Y, CZ_BOTTOM]);
  // 세로 복도 따라 부스 Z까지 이동
  path.push([corridorX, Y, targetZ]);
  // public/data/booths/BoothFrontPos.csv 기준 전면 좌표를 최종 접근점으로 사용
  path.push([targetX, Y, targetZ]);

  return path;
}

export function getBoothPoint(boothId) {
  return boothPositions[boothId] ?? null;
}

export function getBoothRoutePoint(boothId, extraOffset = 0.9) {
  const frontPoint = boothFrontPositions[boothId];
  if (frontPoint) {
    const centerPoint = boothPositions[boothId];
    if (!centerPoint) {
      return frontPoint;
    }

    const directionToCenter = Math.sign(centerPoint[0] - frontPoint[0]);
    const adjustedFrontX = frontPoint[0] + directionToCenter * BOOTH_FRONT_X_INSET;

    return [adjustedFrontX, frontPoint[1]];
  }

  const point = boothPositions[boothId];
  if (!point) {
    return null;
  }

  const [bx, bz] = point;
  const corridorX = getCorridorXForBoothX(bx);
  const approachDirection = Math.sign(corridorX - bx) || 1;
  const routeX = bx + approachDirection * (BOOTH_HALF_WIDTH + BOOTH_ROUTE_MARGIN + extraOffset);

  return [routeX, bz];
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
