const CENTERS_URL = `${import.meta.env.BASE_URL}data/centers.json`;
const SPECIAL_BOOTH_DATA_ID_MAP = {
  SPECIAL1: 'S11B1',
  SPECIAL2: 'S11B2',
};

let centerDataPromise = null;

function normalizeFaq(faq) {
  return {
    q: faq.q ?? faq.question ?? '',
    a: faq.a ?? faq.answer ?? '',
  };
}

function normalizeCenter(center) {
  return {
    id: center.id,
    name: center.center ?? center.name ?? '',
    persona: center.persona ?? '',
    intro: center.intro ?? '',
    faqs: Array.isArray(center.faqs) ? center.faqs.map(normalizeFaq).filter((item) => item.q || item.a) : [],
  };
}

async function fetchCenterData() {
  const response = await fetch(CENTERS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load centers: ${response.status}`);
  }

  return response.json();
}

export async function loadCenterData() {
  if (!centerDataPromise) {
    centerDataPromise = fetchCenterData()
      .then((items) =>
        items.reduce((accumulator, item) => {
          const normalized = normalizeCenter(item);
          if (normalized.id) {
            accumulator[normalized.id] = normalized;
          }
          return accumulator;
        }, {}),
      )
      .catch((error) => {
        centerDataPromise = null;
        throw error;
      });
  }

  return centerDataPromise;
}

export async function loadBoothCenter(boothId) {
  const centers = await loadCenterData();
  const resolvedBoothId = SPECIAL_BOOTH_DATA_ID_MAP[boothId] ?? boothId;
  return centers[resolvedBoothId] ?? null;
}
