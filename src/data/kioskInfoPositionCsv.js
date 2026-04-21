let kioskInfoPositionsPromise = null;

export const CURRENT_KIOSK_INFO_ID = 'Kiosk1';
export const KIOSK_INFO_IDS = ['Kiosk1', 'Kiosk2'];
const KIOSK_INFO_POSITIONS_URL = '/data/booths/Kiosk_Info_Pos.csv';

function normalizeKioskId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'kiosk1' || normalized === '1') {
    return 'Kiosk1';
  }

  if (normalized === 'kiosk2' || normalized === '2') {
    return 'Kiosk2';
  }

  return null;
}

function parseKioskInfoPositionsCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return {};
  }

  const positions = {};

  for (const line of lines.slice(1)) {
    const [rawName, x, , z] = line.split(',');
    const name = rawName?.trim();

    if (!name) {
      continue;
    }

    const posX = Number.parseFloat(x);
    const posZ = Number.parseFloat(z);
    if (Number.isNaN(posX) || Number.isNaN(posZ)) {
      continue;
    }

    // Duplicate keys in the CSV are intentional for kiosk alternatives.
    // The last row wins so CURRENT_KIOSK_INFO_ID can switch between the final resolved positions.
    positions[name] = [posX, posZ];
  }

  return positions;
}

async function fetchKioskInfoPositionsCsv() {
  const response = await fetch(KIOSK_INFO_POSITIONS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load kiosk info positions from ${KIOSK_INFO_POSITIONS_URL}`);
  }

  return parseKioskInfoPositionsCsv(await response.text());
}

export async function loadKioskInfoPositions() {
  if (!kioskInfoPositionsPromise) {
    kioskInfoPositionsPromise = fetchKioskInfoPositionsCsv();
  }

  return kioskInfoPositionsPromise;
}

export function resolveCurrentKioskInfoId(locationLike = null) {
  const fallback = CURRENT_KIOSK_INFO_ID;

  const targetLocation = locationLike
    ?? (typeof window !== 'undefined' ? window.location : null);

  if (!targetLocation) {
    return fallback;
  }

  const searchParams = new URLSearchParams(targetLocation.search ?? '');
  const searchCandidates = [
    searchParams.get('kiosk'),
    searchParams.get('kioskId'),
    searchParams.get('kiosk_id'),
    searchParams.get('currentKiosk'),
    searchParams.get('current_kiosk'),
  ];

  for (const candidate of searchCandidates) {
    const resolved = normalizeKioskId(candidate);
    if (resolved) {
      return resolved;
    }
  }

  const pathCandidates = [
    ...(targetLocation.pathname ?? '').split('/'),
    ...(targetLocation.hash ?? '').split(/[/?#&=]/),
  ];

  for (const candidate of pathCandidates) {
    const resolved = normalizeKioskId(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return fallback;
}

export function getCurrentKioskRouteStart(kioskInfoPositions, kioskId = CURRENT_KIOSK_INFO_ID) {
  const point = kioskInfoPositions?.[kioskId];
  if (!point) {
    return null;
  }

  return [point[0], 0, point[1]];
}
