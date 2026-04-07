const FLOOR_PREFIX_RE = /^Floor_/i;

let positionMapsPromise = null;

function parseBoothPositionCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return {};
  }

  const positions = {};
  for (const line of lines.slice(1)) {
    const [rawId, x, , z] = line.split(',');
    const boothId = rawId?.replace(FLOOR_PREFIX_RE, '').trim().toUpperCase();
    if (!boothId?.startsWith('S')) {
      continue;
    }

    const posX = Number.parseFloat(x);
    const posZ = Number.parseFloat(z);
    if (Number.isNaN(posX) || Number.isNaN(posZ)) {
      continue;
    }

    positions[boothId] = [posX, posZ];
  }

  return positions;
}

async function fetchBoothPositionsCsv(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load booth positions from ${path}`);
  }

  return parseBoothPositionCsv(await response.text());
}

export async function loadBoothPositionMaps() {
  if (!positionMapsPromise) {
    positionMapsPromise = Promise.all([
      fetchBoothPositionsCsv('/data/booths/BoothFloorCenterPos.csv'),
      fetchBoothPositionsCsv('/data/booths/BoothFrontPos.csv'),
    ]).then(([boothPositions, boothFrontPositions]) => ({
      boothPositions,
      boothFrontPositions,
    }));
  }

  return positionMapsPromise;
}

