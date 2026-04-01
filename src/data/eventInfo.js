// 행사 정보 (infoContent.js 기반)
export const eventInfo = {
  title: 'ITRC 인재양성대전 2026',
  subtitle: 'AI 대전환 시대, 기술주권을 이끄는 미래인재',
  date: '2026년 4월 22일(수) ~ 24일(금)',
  venue: 'COEX 서울',
  stats: [
    { label: '참여 대학', value: '38개 대학' },
    { label: '연구센터', value: '81개 센터' },
    { label: '전시 부스', value: '80+ 부스' },
    { label: '관람 예정', value: '5,000+명' },
  ],
  overview: `ITRC 인재양성대전 2026은 정보통신기획평가원(IITP)의 정보통신·방송 연구개발사업 성과를 공유하고 미래 ICT 핵심 인재를 발굴·육성하기 위한 대한민국 최대 규모의 ICT 연구성과 전시회입니다.

전국 38개 대학 81개 연구센터가 참여하여 AI 반도체, 6G 통신, 양자기술, 바이오·헬스케어 등 첨단 ICT 기술 연구 성과를 선보입니다.`,
  programs: [
    {
      title: '연구성과 전시',
      desc: '81개 연구센터의 최신 연구 성과를 직접 체험하고 관람할 수 있는 메인 전시 공간입니다.',
      icon: '🏛️',
      time: '4월 22~24일 10:00~18:00',
    },
    {
      title: '포럼 & 세미나',
      desc: 'AI 대전환 시대의 기술 트렌드와 미래 전망을 주제로 전문가 강연 및 토론이 진행됩니다.',
      icon: '🎤',
      time: '4월 22~23일 13:00~17:00',
    },
    {
      title: '네트워킹 행사',
      desc: '산업체, 연구기관, 학계 전문가들과의 교류를 통해 협력 기회를 모색하는 네트워킹 세션입니다.',
      icon: '🤝',
      time: '4월 22일 18:00~20:00',
    },
    {
      title: '시상식',
      desc: '우수 연구 성과와 뛰어난 인재를 발굴하여 수상하는 시상식이 개최됩니다.',
      icon: '🏆',
      time: '4월 24일 17:00~18:00',
    },
  ],
  exhibitionZones: [
    { id: 1, label: '반도체·디스플레이', icon: '💾', sections: ['S1', 'S3'], desc: 'AI 시스템반도체, 온디바이스 AI, 뉴로컴퓨팅' },
    { id: 2, label: '첨단 바이오·헬스케어', icon: '🧬', sections: ['S3', 'S4'], desc: '의료 AI, 디지털 헬스, 웨어러블 건강관리' },
    { id: 3, label: '클라우드·보안', icon: '🔐', sections: ['S1', 'S4', 'S5'], desc: '제로트러스트, 블록체인, 데이터 프라이버시' },
    { id: 4, label: 'AI·빅데이터', icon: '🤖', sections: ['S2', 'S5', 'S8', 'S10'], desc: '범용AI, 딥러닝, 지식 그래프, 데이터 분석' },
    { id: 5, label: 'AI 플랫폼·서비스', icon: '⚡', sections: ['S1', 'S6'], desc: 'AI 플랫폼, 지능화혁신, 융합 서비스' },
    { id: 6, label: '통신·위성', icon: '📡', sections: ['S6', 'S7'], desc: '6G 통신, 위성 기술, 차세대 네트워크' },
    { id: 7, label: '실감형 SW', icon: '🥽', sections: ['S7', 'S8'], desc: 'XR/AR/VR, 메타버스, 실감 콘텐츠' },
    { id: 8, label: '로보틱스·모빌리티', icon: '🚗', sections: ['S2', 'S8'], desc: '자율주행, 드론, 로봇, UAM' },
    { id: 9, label: '양자기술', icon: '⚛️', sections: ['S8', 'S9'], desc: '양자 컴퓨팅, 양자 통신, 양자 센서' },
    { id: 10, label: 'ICT 산업융합', icon: '🏭', sections: ['S1', 'S2', 'S4', 'S9', 'S10'], desc: '스마트팜, 스마트팩토리, ESG, 지능화혁신' },
  ],
};
