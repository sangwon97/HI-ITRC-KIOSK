const POSTER_TEXTS_URL = `${import.meta.env.BASE_URL}data/poster_texts.json`;
const POSTER_IMAGE_BASE_URL = `${import.meta.env.BASE_URL}data/Poster`;
const SPECIAL_BOOTH_DATA_ID_MAP = {
  SPECIAL1: 'S11B1',
  SPECIAL2: 'S11B2',
};

let postersByBoothPromise = null;

function getBoothIdFromPosterId(posterId) {
  return posterId?.match(/^(S\d+B\d+)/)?.[1] ?? null;
}

function normalizePoster(poster) {
  return {
    ...poster,
    image: `${POSTER_IMAGE_BASE_URL}/${poster.id}.webp`,
  };
}

async function fetchPosterTexts() {
  const response = await fetch(POSTER_TEXTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load poster texts: ${response.status}`);
  }

  return response.json();
}

export async function loadPostersByBooth() {
  if (!postersByBoothPromise) {
    postersByBoothPromise = fetchPosterTexts()
      .then((items) =>
        items.reduce((accumulator, item) => {
          const boothId = getBoothIdFromPosterId(item.id);
          if (!boothId) {
            return accumulator;
          }

          if (!accumulator[boothId]) {
            accumulator[boothId] = [];
          }

          accumulator[boothId].push(normalizePoster(item));
          return accumulator;
        }, {}),
      )
      .then((grouped) => {
        Object.values(grouped).forEach((posters) => {
          posters.sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
        });

        return grouped;
      })
      .catch((error) => {
        postersByBoothPromise = null;
        throw error;
      });
  }

  return postersByBoothPromise;
}

export async function loadBoothPosters(boothId) {
  const postersByBooth = await loadPostersByBooth();
  const resolvedBoothId = SPECIAL_BOOTH_DATA_ID_MAP[boothId] ?? boothId;
  return postersByBooth[resolvedBoothId] ?? [];
}
