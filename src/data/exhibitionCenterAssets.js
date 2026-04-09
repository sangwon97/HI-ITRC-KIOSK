import { booths } from './booths';

const ASSET_BASE = `${import.meta.env.BASE_URL}data/exhibition-centers/`;
const MANIFEST_URL = `${ASSET_BASE}center_assets_manifest.json`;
const SPECIAL_CATEGORY_LABEL = '특별전시관';

const CATEGORY_LABEL_TO_ID = {
  '반도체·디스플레이': 'ai_semiconductor',
  '첨단 바이오·헬스케어': 'bio_healthcare',
  '클라우드·보안·블록체인': 'cloud_security',
  '차세대 AI·빅데이터': 'ai_bigdata',
  'AI 플랫폼·서비스': 'ai_platform',
  '차세대 통신·위성': 'next_gen_comm',
  '실감형 SW·콘텐츠': 'immersive_sw',
  '첨단 로봇·모빌리티': 'robotics_mobility',
  '양자컴퓨팅·데이터센터': 'quantum',
  'ICT 산업융합': 'ict_industry',
};

const UNIVERSITY_ALIASES = {
  '한국과학기술원': 'KAIST',
  '광주과학기술원': 'GIST',
  '울산과학기술원': 'UNIST',
  '포항공과대학교': 'POSTECH',
};

const MANUAL_BOOTH_MATCHES = new Map([
  ['금오공과대학교|금오공과대학교 온센터 AI 반도체 연구센터', 'S7B5'],
  ['경희대학교|경희대학교 클라우드 기반 데이터 보안', 'S4B7'],
  ['중앙대학교|중앙대학교 5G/6G 차세대 통신 네트워크 연구센터', 'S2B6'],
  ['경북대학교|경북대학교 복학지능 ICT 연구센터', 'S9B9'],
]);

const DISPLAY_TITLE_OVERRIDES = new Map([
  ['S1B1', 'Knowledge Science 연구센터'],
  ['S1B7', 'AiLIVE 연구센터'],
  ['S2B1', '초지능통신/컴퓨터융합 연구센터'],
  ['S2B3', '6H 차세대이동통신기술 ICT 인력 양성'],
  ['S3B3', '일상-항시적 건강 관리 Earable-IoT 연구센터'],
  ['S4B2', '엣지클라우드 데이터보안 연구센터'],
  ['S4B7', '클라우드 기반 데이터 보안'],
  ['S5B1', 'VR/AR 기반의 지능형 라이프컨설턴트 연구센터'],
  ['S5B7', 'XR 워크스테이션 HCI 기술 연구센터'],
  ['S7B7', '인공지능 반도체 시스템 연구센터'],
  ['S8B4', '지역지능화ACE연구센터'],
  ['S8B5', '인공지능그랜드ICT연구센터'],
  ['S8B6', '디지털트윈 기반 스마트에너지 시티 산업 인프라'],
  ['S8B8', '충남지능화혁신 CORE-AI 센터'],
  ['S9B9', '복학지능 ICT 연구센터'],
]);

let exhibitionCenterEntriesPromise = null;

function normalizeText(value = '') {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·ㆍ•()\-&,/.]/g, '');
}

function normalizeUniversityName(value = '') {
  const alias = UNIVERSITY_ALIASES[value] ?? value;
  return normalizeText(alias);
}

function stripUniversityPrefix(value = '') {
  return Object.keys(UNIVERSITY_ALIASES)
    .concat([
      'KAIST',
      'GIST',
      'UNIST',
      'POSTECH',
      '고려대학교 세종캠퍼스',
      '고려대학교',
      '동국대학교',
      '부산대학교',
      '경희대학교',
      '아주대학교',
      '세종대학교',
      '광운대학교',
      '서강대학교',
      '중앙대학교',
      '인하대학교',
      '전남대학교',
      '성균관대학교',
      '강원대학교',
      '창원대학교',
      '경북대학교',
      '충북대학교',
      '호서대학교',
      '금오공과대학교',
      '공주대학교',
      '배재대학교',
      '동의대학교',
      '가천대학교',
      '순천대학교',
      '한국공학대학교',
      '단국대학교',
      '서울대학교',
      '이화여자대학교',
      '전북대학교',
      '경남대학교',
      '충남대학교',
      '한밭대학교',
      '인천대학교',
    ])
    .reduce((text, university) => text.replace(university, ''), value);
}

function normalizeCenterName(value = '') {
  return normalizeText(stripUniversityPrefix(value))
    .replace(/연구센터|센터|사업단|인력양성연구센터|인력양성센터|인력양성|신기술|기술/g, '')
    .replace(/&/g, '')
    .replace(/온센터/g, '온센서')
    .replace(/복학지능/g, '복합지능')
    .replace(/건강관리/g, '건강관리')
    .replace(/건강관리earableiot/g, 'earableiot')
    .replace(/6g무선통신글로컬/g, '6g무선통신글로컬')
    .replace(/5g6g/g, '5g6g');
}

function buildDisplayTitle(item, booth) {
  const overriddenTitle = DISPLAY_TITLE_OVERRIDES.get(booth.id);
  if (overriddenTitle) {
    return overriddenTitle;
  }

  const strippedTitle = stripUniversityPrefix(item.center_name).trim();
  if (strippedTitle) {
    return strippedTitle;
  }

  return booth.name;
}

function sortEntriesByBoothId(a, b) {
  return a.boothId.localeCompare(b.boothId, 'ko', { numeric: true });
}

async function fetchManifest() {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error('전시 구역 로고 자산을 불러오지 못했습니다.');
  }

  return response.json();
}

function getBoothMatch(item, boothIndexByUniversity, boothIndex) {
  const manualMatch = MANUAL_BOOTH_MATCHES.get(`${item.university}|${item.center_name}`);
  if (manualMatch) {
    return booths.find((booth) => booth.id === manualMatch) ?? null;
  }

  const normalizedUniversity = normalizeUniversityName(item.university);
  const normalizedCenterName = normalizeCenterName(item.center_name);
  const universityCandidates = boothIndexByUniversity.get(normalizedUniversity) ?? [];

  const exactMatch = universityCandidates.find((candidate) => candidate.normalizedCenter === normalizedCenterName);
  if (exactMatch) {
    return exactMatch.booth;
  }

  const partialMatch = universityCandidates.find(
    (candidate) => candidate.normalizedCenter.includes(normalizedCenterName)
      || normalizedCenterName.includes(candidate.normalizedCenter),
  );
  if (partialMatch) {
    return partialMatch.booth;
  }

  const fallbackMatch = boothIndex.find(
    (candidate) => candidate.normalizedCenter === normalizedCenterName
      || candidate.normalizedCenter.includes(normalizedCenterName)
      || normalizedCenterName.includes(candidate.normalizedCenter),
  );

  return fallbackMatch?.booth ?? null;
}

export async function loadExhibitionCenterEntries() {
  if (!exhibitionCenterEntriesPromise) {
    exhibitionCenterEntriesPromise = fetchManifest().then((manifest) => {
      const boothIndex = booths.map((booth) => ({
        booth,
        normalizedUniversity: normalizeUniversityName(booth.univ),
        normalizedCenter: normalizeCenterName(booth.name),
      }));

      const boothIndexByUniversity = boothIndex.reduce((map, candidate) => {
        const current = map.get(candidate.normalizedUniversity) ?? [];
        current.push(candidate);
        map.set(candidate.normalizedUniversity, current);
        return map;
      }, new Map());

      const entries = manifest
        .filter((item) => item.category !== SPECIAL_CATEGORY_LABEL)
        .map((item) => {
          const booth = getBoothMatch(item, boothIndexByUniversity, boothIndex);
          if (!booth) {
            return null;
          }

          return {
            boothId: booth.id,
            categoryId: CATEGORY_LABEL_TO_ID[item.category] ?? booth.category,
            title: buildDisplayTitle(item, booth),
            university: booth.univ,
            logoSrc: `${ASSET_BASE}${item.image_file}`,
          };
        })
        .filter(Boolean)
        .sort(sortEntriesByBoothId);

      return entries;
    });
  }

  return exhibitionCenterEntriesPromise;
}
