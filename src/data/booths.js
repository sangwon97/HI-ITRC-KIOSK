// 전시 부스 데이터 (BoothName_PosRot.csv 기반)
export const booths = [
  { id: 'S1B1', section: 'S1', booth: 'B1', name: '대규모 데이터센터용 인공지능 시스템반도체 연구센터', univ: '서강대학교', category: 'ai_semiconductor' },
  { id: 'S1B2', section: 'S1', booth: 'B2', name: 'AI 반도체 프로세싱 SW 연구센터', univ: '서울과학기술대학교', category: 'ai_semiconductor' },
  { id: 'S1B3', section: 'S1', booth: 'B3', name: 'AI보안', univ: '숭실대학교', category: 'cloud_security' },
  { id: 'S1B4', section: 'S1', booth: 'B4', name: '제로트러스트 클라우드 보안 신기술 연구센터', univ: '부산대학교', category: 'cloud_security' },
  { id: 'S1B5', section: 'S1', booth: 'B5', name: '디지털트윈 기반 스마트에너지 시티 산업 인프라', univ: '중앙대학교', category: 'ict_industry' },
  { id: 'S1B6', section: 'S1', booth: 'B6', name: '지능화혁신G5-AICT연구센터', univ: '전남대학교', category: 'ai_platform' },
  { id: 'S1B7', section: 'S1', booth: 'B7', name: '충남지능화혁신(CORE-AI)센터', univ: '호서대학교', category: 'ai_platform' },
  { id: 'S2B1', section: 'S2', booth: 'B1', name: '초연결 기반 협력형 무인 자율 이동체 연구센터', univ: '금오공과대학교', category: 'robotics_mobility' },
  { id: 'S2B2', section: 'S2', booth: 'B2', name: 'Digital-X AIoT 연구센터', univ: '부산대학교', category: 'ai_bigdata' },
  { id: 'S2B3', section: 'S2', booth: 'B3', name: '인공지능그랜드ICT연구센터', univ: '동의대학교', category: 'ai_bigdata' },
  { id: 'S2B4', section: 'S2', booth: 'B4', name: '스마트ICT융합인재양성센터', univ: '배재대학교', category: 'ict_industry' },
  { id: 'S2B5', section: 'S2', booth: 'B5', name: '지역지능화ACE연구센터', univ: '인하대학교', category: 'ai_bigdata' },
  { id: 'S2B6', section: 'S2', booth: 'B6', name: '경남지능화혁신사업단', univ: '경남대학교', category: 'ict_industry' },
  { id: 'S2B7', section: 'S2', booth: 'B7', name: '전북RICE지능화혁신연구센터', univ: '전북대학교', category: 'ict_industry' },
  { id: 'S3B1', section: 'S3', booth: 'B1', name: '인공지능반도체시스템', univ: '한국과학기술원', category: 'ai_semiconductor' },
  { id: 'S3B2', section: 'S3', booth: 'B2', name: '인공지능 시스템반도체', univ: '인하대학교', category: 'ai_semiconductor' },
  { id: 'S3B3', section: 'S3', booth: 'B3', name: '휴먼브레인 뉴로컴퓨팅 플랫폼 연구센터', univ: '광운대학교', category: 'ai_semiconductor' },
  { id: 'S3B4', section: 'S3', booth: 'B4', name: '온디바이스 AI 반도체 연구센터', univ: '세종대학교', category: 'ai_semiconductor' },
  { id: 'S3B5', section: 'S3', booth: 'B5', name: '온센터 AI반도체 연구센터', univ: '금오공과대학교', category: 'ai_semiconductor' },
  { id: 'S3B6', section: 'S3', booth: 'B6', name: '초광역 연합 의료 AI 연구센터', univ: '전남대학교', category: 'bio_healthcare' },
  { id: 'S3B7', section: 'S3', booth: 'B7', name: '스마트시티 지능형 헬스케어 연구센터', univ: '고려대학교 세종캠퍼스', category: 'bio_healthcare' },
  { id: 'S4B1', section: 'S4', booth: 'B1', name: '지능형 의료 영상 진단 솔루션', univ: '아주대학교', category: 'bio_healthcare' },
  { id: 'S4B2', section: 'S4', booth: 'B2', name: '일상-항시적 건강 관리 Earable-IoT', univ: '한국과학기술원', category: 'bio_healthcare' },
  { id: 'S4B3', section: 'S4', booth: 'B3', name: '5T-SPACE 연구센터', univ: '울산과학기술원', category: 'bio_healthcare' },
  { id: 'S4B4', section: 'S4', booth: 'B4', name: 'ICT명품인재양성사업단', univ: '성균관대학교', category: 'ict_industry' },
  { id: 'S4B5', section: 'S4', booth: 'B5', name: '강원지능화혁신센터', univ: '강원대학교', category: 'ict_industry' },
  { id: 'S4B6', section: 'S4', booth: 'B6', name: '빅데이터 엣지 클라우드 서비스', univ: '한국과학기술원', category: 'cloud_security' },
  { id: 'S4B7', section: 'S4', booth: 'B7', name: '엣지클라우드 데이터보안 연구센터', univ: '고려대학교 세종캠퍼스', category: 'cloud_security' },
  { id: 'S4B8', section: 'S4', booth: 'B8', name: '클라우드 컨티뉴엄 연구센터', univ: '경희대학교', category: 'cloud_security' },
  { id: 'S5B1', section: 'S5', booth: 'B1', name: '블록체인 플랫폼', univ: '부산대학교', category: 'cloud_security' },
  { id: 'S5B2', section: 'S5', booth: 'B2', name: '블록체인 지능 융합', univ: '광주과학기술원', category: 'cloud_security' },
  { id: 'S5B3', section: 'S5', booth: 'B3', name: '데이터 프라이버시 연구센터', univ: '중앙대학교', category: 'cloud_security' },
  { id: 'S5B4', section: 'S5', booth: 'B4', name: '딥페이크 연구센터', univ: '성균관대학교', category: 'cloud_security' },
  { id: 'S5B5', section: 'S5', booth: 'B5', name: '웹3.0 융합 기술 연구 센터', univ: '서강대학교', category: 'cloud_security' },
  { id: 'S5B6', section: 'S5', booth: 'B6', name: 'Knowledge Science', univ: '동국대학교', category: 'ai_bigdata' },
  { id: 'S5B7', section: 'S5', booth: 'B7', name: '범용 인공지능 연구센터', univ: '고려대학교', category: 'ai_bigdata' },
  { id: 'S5B8', section: 'S5', booth: 'B8', name: 'Open-ended Alignment 인공지능 연구센터', univ: '성균관대학교', category: 'ai_bigdata' },
  { id: 'S5B9', section: 'S5', booth: 'B9', name: 'AiLIVE 연구센터', univ: '경희대학교', category: 'ai_bigdata' },
  { id: 'S5B10', section: 'S5', booth: 'B10', name: '초지능연구센터', univ: '고려대학교', category: 'ai_bigdata' },
  { id: 'S6B1', section: 'S6', booth: 'B1', name: '인간 인지-지능 증강 연구센터', univ: '포항공과대학교', category: 'ai_platform' },
  { id: 'S6B2', section: 'S6', booth: 'B2', name: '6H 차세대이동통신기술 ICT 인력 양성', univ: '경희대학교', category: 'next_gen_comm' },
  { id: 'S6B3', section: 'S6', booth: 'B3', name: '초공간 과업지향통신 연구센터', univ: '광운대학교', category: 'next_gen_comm' },
  { id: 'S6B4', section: 'S6', booth: 'B4', name: '6G 무선통신 글로컬 연구센터', univ: '한밭대학교', category: 'next_gen_comm' },
  { id: 'S6B5', section: 'S6', booth: 'B5', name: 'VIACOMM 연구센터', univ: '충남대학교', category: 'next_gen_comm' },
  { id: 'S6B6', section: 'S6', booth: 'B6', name: '초지능통신/컴퓨터융합', univ: '한국과학기술원', category: 'next_gen_comm' },
  { id: 'S6B7', section: 'S6', booth: 'B7', name: '5G/6G 차세대 통신 네트워크 연구센터', univ: '중앙대학교', category: 'next_gen_comm' },
  { id: 'S7B1', section: 'S7', booth: 'B1', name: 'NS-위성 RTDC 기술 연구센터', univ: '인천대학교', category: 'next_gen_comm' },
  { id: 'S7B2', section: 'S7', booth: 'B2', name: '위성영상분석ICT연구센터', univ: '창원대학교', category: 'next_gen_comm' },
  { id: 'S7B3', section: 'S7', booth: 'B3', name: '탄소중립 미래자율통신 연구센터', univ: '고려대학교', category: 'next_gen_comm' },
  { id: 'S7B4', section: 'S7', booth: 'B4', name: 'VR/AR 기반의 지능형 라이프컨설턴트', univ: '아주대학교', category: 'immersive_sw' },
  { id: 'S7B5', section: 'S7', booth: 'B5', name: '시뮬레이션 기반 융복합 콘텐츠', univ: '이화여자대학교', category: 'immersive_sw' },
  { id: 'S7B6', section: 'S7', booth: 'B6', name: '메타버스 자율트윈', univ: '세종대학교', category: 'immersive_sw' },
  { id: 'S7B7', section: 'S7', booth: 'B7', name: '초실감 XR 연구센터', univ: '세종대학교', category: 'immersive_sw' },
  { id: 'S7B8', section: 'S7', booth: 'B8', name: '실감콘텐츠 단말 기술', univ: '광운대학교', category: 'immersive_sw' },
  { id: 'S7B9', section: 'S7', booth: 'B9', name: '스마트미디어 서비스', univ: '고려대학교', category: 'immersive_sw' },
  { id: 'S8B1', section: 'S8', booth: 'B1', name: 'XR 워크스테이션 HCI 기술 연구센터', univ: '한국과학기술원', category: 'immersive_sw' },
  { id: 'S8B2', section: 'S8', booth: 'B2', name: '국방 지능형 군집체계 연구센터', univ: '한국과학기술원', category: 'robotics_mobility' },
  { id: 'S8B3', section: 'S8', booth: 'B3', name: '배리어프리 ICT기술 연구센터', univ: '단국대학교', category: 'ict_industry' },
  { id: 'S8B4', section: 'S8', booth: 'B4', name: 'UAM-eVTOL 융합 연구센터', univ: '세종대학교', category: 'robotics_mobility' },
  { id: 'S8B5', section: 'S8', booth: 'B5', name: '3차원 모빌리티 통신 센터', univ: '서울대학교', category: 'robotics_mobility' },
  { id: 'S8B6', section: 'S8', booth: 'B6', name: '데이터 기반 지능형 모빌리티 연구센터', univ: '경북대학교', category: 'robotics_mobility' },
  { id: 'S8B7', section: 'S8', booth: 'B7', name: '산업인공지능연구센터', univ: '충북대학교', category: 'ai_bigdata' },
  { id: 'S8B8', section: 'S8', booth: 'B8', name: '지능통감융합 연구센터', univ: '한국과학기술원', category: 'ai_bigdata' },
  { id: 'S8B9', section: 'S8', booth: 'B9', name: '양자정보과학기술 연구센터', univ: '세종대학교', category: 'quantum' },
  { id: 'S8B10', section: 'S8', booth: 'B10', name: '초신뢰 양자인터넷', univ: '고려대학교', category: 'quantum' },
  { id: 'S8B11', section: 'S8', booth: 'B11', name: '양자정보소자 인력양성 연구센터', univ: '포항공과대학교', category: 'quantum' },
  { id: 'S8B12', section: 'S8', booth: 'B12', name: '양자센서 인력양성', univ: '부산대학교', category: 'quantum' },
  { id: 'S9B1', section: 'S9', booth: 'B1', name: '양자센싱 융합기술 연구센터', univ: '울산과학기술원', category: 'quantum' },
  { id: 'S9B2', section: 'S9', booth: 'B2', name: '양자기술 플랫폼 연구센터', univ: '충북대학교', category: 'quantum' },
  { id: 'S9B3', section: 'S9', booth: 'B3', name: '하이퍼-컴포저블 데이터센터', univ: '울산과학기술원', category: 'cloud_security' },
  { id: 'S9B4', section: 'S9', booth: 'B4', name: '탄소중립 ESG ICT 연구센터', univ: '중앙대학교', category: 'ict_industry' },
  { id: 'S9B5', section: 'S9', booth: 'B5', name: '복합지능 ICT', univ: '경북대학교', category: 'ict_industry' },
  { id: 'S9B6', section: 'S9', booth: 'B6', name: 'ICT융합연구센터', univ: '경북대학교', category: 'ict_industry' },
  { id: 'S10B1', section: 'S10', booth: 'B1', name: '차세대 스마트팜 ICT 융합기술 연구센터', univ: '공주대학교', category: 'ict_industry' },
  { id: 'S10B2', section: 'S10', booth: 'B2', name: '저탄소 농업 기반 스마트 유통 연구센터', univ: '순천대학교', category: 'ict_industry' },
  { id: 'S10B3', section: 'S10', booth: 'B3', name: '스마트군수혁신 융합연구센터', univ: '금오공과대학교', category: 'ict_industry' },
  { id: 'S10B4', section: 'S10', booth: 'B4', name: '지능형스마트농업 Grand ICT연구센터', univ: '순천대학교', category: 'ict_industry' },
  { id: 'S10B5', section: 'S10', booth: 'B5', name: 'ICT융합 특성화 연구센터', univ: '금오공과대학교', category: 'ict_industry' },
  { id: 'S10B6', section: 'S10', booth: 'B6', name: 'ICT융합 제조지능화 진흥연구센터', univ: '한국공학대학교', category: 'ict_industry' },
  { id: 'S10B7', section: 'S10', booth: 'B7', name: 'AI융합연구원', univ: '숭실대학교', category: 'ai_bigdata' },
  { id: 'S10B8', section: 'S10', booth: 'B8', name: '데이터기반 에너지시스템 혁신 연구센터', univ: '가천대학교', category: 'ai_bigdata' },
];

export const categories = [
  { id: 'ai_semiconductor', label: '반도체·디스플레이', icon: '💾', color: '#6c63ff' },
  { id: 'bio_healthcare', label: '첨단 바이오·헬스케어', icon: '🧬', color: '#00c896' },
  { id: 'cloud_security', label: '클라우드·보안', icon: '🔐', color: '#ff6b6b' },
  { id: 'ai_bigdata', label: 'AI·빅데이터', icon: '🤖', color: '#f7b731' },
  { id: 'ai_platform', label: 'AI 플랫폼·서비스', icon: '⚡', color: '#45aaf2' },
  { id: 'next_gen_comm', label: '통신·위성', icon: '📡', color: '#26de81' },
  { id: 'immersive_sw', label: '실감형 SW', icon: '🥽', color: '#fd9644' },
  { id: 'robotics_mobility', label: '로보틱스·모빌리티', icon: '🤖', color: '#eb3b5a' },
  { id: 'quantum', label: '양자기술', icon: '⚛️', color: '#a29bfe' },
  { id: 'ict_industry', label: 'ICT 산업융합', icon: '🏭', color: '#20bf6b' },
];

export function getBoothsByCategory(categoryId) {
  return booths.filter(b => b.category === categoryId);
}

export function getBoothById(id) {
  return booths.find(b => b.id === id);
}

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHOSEONG_QUERY_RE = /^[ㄱ-ㅎ]+$/;

function normalizeSearchText(value) {
  return value.normalize('NFC').toLowerCase();
}

function extractInitialConsonants(value) {
  return [...value.normalize('NFC')]
    .map((char) => {
      const code = char.charCodeAt(0);

      if (code >= HANGUL_BASE && code <= HANGUL_END) {
        const syllableIndex = code - HANGUL_BASE;
        const choseongIndex = Math.floor(syllableIndex / (21 * 28));
        return CHOSEONG[choseongIndex];
      }

      if (/[ㄱ-ㅎ]/.test(char)) {
        return char;
      }

      if (/[a-z0-9]/i.test(char)) {
        return char.toLowerCase();
      }

      return '';
    })
    .join('');
}

export function searchBooths(query) {
  const q = normalizeSearchText(query.trim());

  if (!q) {
    return [];
  }

  const isChoseongQuery = CHOSEONG_QUERY_RE.test(q);

  return booths.filter((b) => {
    const normalizedName = normalizeSearchText(b.name);
    const normalizedUniv = normalizeSearchText(b.univ);

    if (normalizedName.includes(q) || normalizedUniv.includes(q)) {
      return true;
    }

    if (!isChoseongQuery) {
      return false;
    }

    const nameInitials = extractInitialConsonants(b.name);
    const univInitials = extractInitialConsonants(b.univ);

    return nameInitials.includes(q) || univInitials.includes(q);
  });
}
