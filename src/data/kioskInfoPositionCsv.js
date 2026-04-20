let kioskInfoPositionsPromise = null;

export const CURRENT_KIOSK_INFO_ID = 'Kiosk1';
const KIOSK_INFO_POSITIONS_URL = '/data/booths/Kiosk_Info_Pos.csv';

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

export function getCurrentKioskRouteStart(kioskInfoPositions, kioskId = CURRENT_KIOSK_INFO_ID) {
  const point = kioskInfoPositions?.[kioskId];
  if (!point) {
    return null;
  }

  return [point[0], 0, point[1]];
}
