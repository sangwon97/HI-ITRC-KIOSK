const TECHNOLOGY_ANSWERS = [
  {
    id: '6g',
    terms: ['6g', '6세대', '차세대통신', '차세대통신기술', '통신기술', '무선통신'],
    title: '6G 통신 기술',
    summary:
      '6G는 5G 이후의 차세대 이동통신 기술로, 더 빠른 속도뿐 아니라 초저지연, 초연결, 고신뢰 통신, AI 기반 네트워크 제어를 목표로 합니다.',
    points: [
      '초고속 데이터 전송으로 XR, 홀로그램, 디지털 트윈 같은 대용량 서비스를 지원합니다.',
      '위성, 지상망, 비지상망을 함께 연결해 더 넓은 통신 커버리지를 만드는 방향으로 발전하고 있습니다.',
      'AI가 네트워크 상태를 분석하고 자원을 자동으로 최적화하는 지능형 네트워크가 핵심입니다.',
      '자율주행, 스마트팩토리, 원격의료처럼 지연 시간이 중요한 서비스에 활용될 수 있습니다.',
    ],
  },
  {
    id: 'ai',
    terms: ['ai', '인공지능', '머신러닝', '딥러닝'],
    title: 'AI 기술',
    summary:
      'AI는 데이터를 학습해 분류, 예측, 생성, 추천 같은 판단 작업을 수행하는 기술입니다.',
    points: [
      '이미지, 음성, 텍스트, 센서 데이터 등 다양한 정보를 분석할 수 있습니다.',
      '최근에는 생성형 AI와 온디바이스 AI처럼 실제 서비스에 가까운 형태로 확장되고 있습니다.',
      '전시장에서는 반도체, 의료, 통신, 플랫폼 분야와 결합된 AI 연구를 함께 볼 수 있습니다.',
    ],
  },
  {
    id: 'quantum',
    terms: ['양자', '양자통신', '양자센서', '양자기술'],
    title: '양자 기술',
    summary:
      '양자 기술은 양자역학의 성질을 활용해 통신, 센싱, 컴퓨팅의 성능과 보안성을 높이는 기술입니다.',
    points: [
      '양자통신은 도청 여부를 감지할 수 있어 보안 통신 분야에서 주목받습니다.',
      '양자센서는 매우 미세한 물리 변화를 측정하는 데 활용될 수 있습니다.',
      '양자컴퓨팅은 특정 계산 문제에서 기존 컴퓨터보다 높은 성능을 목표로 합니다.',
    ],
  },
  {
    id: 'blockchain',
    terms: ['블록체인', '웹3', 'web3'],
    title: '블록체인·웹3 기술',
    summary:
      '블록체인은 데이터를 여러 참여자가 함께 검증하고 저장하는 분산 원장 기술입니다.',
    points: [
      '데이터 위변조를 어렵게 만들어 신뢰가 필요한 서비스에 활용됩니다.',
      '웹3는 블록체인을 기반으로 사용자 소유권과 탈중앙화를 강조하는 인터넷 서비스 흐름입니다.',
      '보안, 인증, 데이터 거래, 디지털 자산 관리 분야와 연결됩니다.',
    ],
  },
];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function isTechnologyExplanationQuery(query) {
  const normalizedQuery = normalizeText(query);
  const asksForExplanation = ['알려줘', '설명', '뭐야', '무엇', '뜻', '원리'].some((term) =>
    normalizedQuery.includes(normalizeText(term)),
  );
  const asksForBooth = ['부스', '추천', '보고', '찾아', '위치', '어디'].some((term) =>
    normalizedQuery.includes(normalizeText(term)),
  );

  return asksForExplanation && !asksForBooth;
}

export function getTechnologyAnswer(query) {
  const normalizedQuery = normalizeText(query);

  return TECHNOLOGY_ANSWERS.find((answer) =>
    answer.terms.some((term) => normalizedQuery.includes(normalizeText(term))),
  ) ?? null;
}
