// 포스터 데이터 (posterInfo.js 기반)
export const postersByBooth = {
  S1B1: [
    { id: 'S1B1P1', image: 'imgs/Posters/S1B1P1.webp', title: '멀티모달 AI - 속성 분류 및 비디오 캡션 생성', description: '본 연구에서는 이미지 속성 분류와 비디오 밀집 캡션 생성 성능을 향상시키기 위해 SugaFormer와 VidChain 모델을 제안하였습니다. 특히 M-DPO 최적화 기법을 도입하여 멀티모달 데이터 간의 정합성을 높이고, 다양한 시각 정보를 통합적으로 처리할 수 있는 AI 프레임워크를 구현하였습니다.' },
    { id: 'S1B1P2', image: 'imgs/Posters/S1B1P2.webp', title: '행동 복제에서 공변량 이동 완화', description: '본 연구에서는 오프라인 모방 학습 환경에서 발생하는 공변량 이동(Covariate Shift) 문제를 해결하기 위해 분포적으로 강건한 최적화(DRO) 기법과 DrilDICE 알고리즘을 결합하였습니다. 이를 통해 전문가 데이터가 제한된 환경에서도 안정적인 정책 학습이 가능함을 실험적으로 검증하였습니다.' },
    { id: 'S1B1P3', image: 'imgs/Posters/S1B1P3.webp', title: 'MATE - 이미지와 긴 텍스트 연결 임베딩', description: '본 연구에서는 VLM(비전-언어 모델)과 LLM(대형 언어 모델)을 통합하는 MATE 방법론을 제안하였습니다. 기존 모델이 짧은 캡션에 한정되어 있던 한계를 극복하고, 긴 텍스트와 이미지 간의 크로스모달 검색 성능을 대폭 향상시킴으로써 실용적인 멀티모달 검색 시스템 구현 가능성을 제시하였습니다.' },
    { id: 'S1B1P4', image: 'imgs/Posters/S1B1P4.webp', title: '의미 불확실성 기반 적응형 RAG 검색', description: '본 연구에서는 대형 언어 모델(LLM)의 환각(Hallucination) 문제를 완화하기 위해 의미 엔트로피를 기반으로 외부 검색 여부를 동적으로 결정하는 SUGAR 시스템을 개발하였습니다. 적응형 RAG(Retrieval-Augmented Generation) 방식을 채택하여 불필요한 검색을 최소화하면서도 답변 신뢰도를 높이는 질의응답 프레임워크를 구현하였습니다.' },
    { id: 'S1B1P5', image: 'imgs/Posters/S1B1P5.webp', title: '사족보행 로봇 시공간 모션 리타겟팅', description: '본 연구에서는 노이즈가 포함된 소스 모션 데이터를 임의의 사족보행 로봇에 적용할 수 있도록 공간적·시간적 모션 리타겟팅 기법을 제안하였습니다. Go1 및 AlienGo 로봇을 대상으로 한 실험을 통해 서로 다른 신체 구조를 가진 로봇 간에도 자연스러운 동작 전이가 가능함을 입증하였습니다.' },
  ],
  S1B2: [
    { id: 'S1B2P1', image: 'imgs/Posters/S1B2P1.webp', title: 'IDEA Lab - 정보 검색 연구 소개', description: '고려대학교 IDEA Lab에서는 LLM 기반 개념 커버리지 쿼리 생성 기술과 토픽 기반 데모 검색을 통한 인컨텍스트 학습 향상 기술을 연구하고 있습니다. 이 두 가지 핵심 연구를 통해 정보 검색의 정확도와 다양성을 동시에 개선하는 것을 목표로 하고 있습니다.' },
    { id: 'S1B2P2', image: 'imgs/Posters/S1B2P2.webp', title: 'Event-T2M - 이벤트 수준 텍스트-모션 합성', description: '고려대학교 IIIXR Lab에서는 복잡한 텍스트 조건에서도 자연스러운 모션을 생성하기 위한 이벤트 레벨 조건화 프레임워크 Event-T2M을 제안하였습니다. 기존 모델 대비 FID(Fréchet Inception Distance) 지표를 36% 이상 향상시킴으로써 텍스트-모션 합성 분야에서 의미 있는 성능 개선을 달성하였습니다.' },
    { id: 'S1B2P3', image: 'imgs/Posters/S1B2P3.webp', title: '비주얼 컴퓨팅 AI Lab - 3D 인식 및 영상 생성', description: '고려대학교 비주얼 컴퓨팅 AI Lab에서는 단일 이미지로부터 3D 인간 자세를 추정하는 기술과 뉴럴 렌더링 및 비디오 생성 모델 기반의 사람 애니메이션·영상 합성 연구를 수행하고 있습니다. 이를 통해 현실감 높은 가상 인간 콘텐츠 제작 기반 기술을 구축하고 있습니다.' },
    { id: 'S1B2P4', image: 'imgs/Posters/S1B2P4.webp', title: '워터마크 픽셀 셔플링 기반 이미지 자가복구', description: '고려대학교 멀티모달 상호작용형 지능 연구실에서는 변조 공격에 강건한 이미지 자가복구 시스템을 개발하였습니다. 비가역 워터마킹 기법과 픽셀 셔플링 기술을 결합함으로써 악의적인 이미지 위변조가 발생하더라도 원본을 안전하게 복원할 수 있는 방법론을 제시하였습니다.' },
    { id: 'S1B2P5', image: 'imgs/Posters/S1B2P5.webp', title: '구강 스캔 치관으로부터 치근 형태 완성', description: '본 연구에서는 구강 내 스캔을 통해 획득한 치아 크라운 데이터만으로 치근 형태를 자동 복원하는 기술을 개발하였습니다. 확산 모델(Diffusion Model)과 패치 교란(Patch Perturbation) 기법을 3D 포인트 클라우드 딥러닝에 적용하여, 방사선 촬영 없이도 정밀한 치근 형태 예측이 가능함을 실험적으로 입증하였습니다.' },
  ],
  S1B3: [
    { id: 'S1B3P1', image: 'imgs/Posters/S1B3P1.webp', title: 'QMARL 기반 스케줄링 및 Neural Myerson 경매 자원 분배', description: '본 연구에서는 양자 멀티에이전트 강화학습(QMARL)을 엣지 네트워크 스케줄링에 적용하여 자원 할당 효율을 높이는 프레임워크를 제안하였습니다.' },
    { id: 'S1B3P2', image: 'imgs/Posters/S1B3P2.webp', title: '드론 배송용 SafeGPT 기반 UAV 제어 시스템', description: '본 연구에서는 드론 배송 환경의 안전성을 높이기 위해 SafeGPT를 활용한 2계층 GPT 구조를 설계하였습니다. Hallucination Filter를 통해 모델의 오작동을 실시간으로 검출·차단합니다.' },
    { id: 'S1B3P3', image: 'imgs/Posters/S1B3P3.webp', title: 'Starlink 위성 핸드오버 위치 추정 및 식별', description: '본 연구에서는 저궤도(LEO) 위성 통신 환경에서의 원활한 핸드오버를 지원하기 위해 3단계 기법을 제안하였습니다.' },
    { id: 'S1B3P4', image: 'imgs/Posters/S1B3P4.webp', title: 'CC-SMARL 기반 탄소 중립 드론 충전 스케줄링', description: '본 연구에서는 드론 충전 스케줄링 과정에서 탄소 중립을 실현하기 위해 가상 탄소 큐(Virtual Carbon Queue) 개념을 도입하였습니다.' },
    { id: 'S1B3P5', image: 'imgs/Posters/S1B3P5.webp', title: 'MAPF-Dec: LLM 기반 다중 에이전트 경로 탐색', description: '본 연구에서는 다중 에이전트 경로 탐색(MAPF) 문제를 해결하기 위해 LLM 기반의 MAPF-Dec 알고리즘을 제안하였습니다.' },
  ],
  S1B4: [
    { id: 'S1B4P1', image: 'imgs/Posters/S1B4P1.webp', title: 'AoI 기반 자율주행 차량 정보 신선도 스케줄링', description: '본 연구에서는 자율주행 사고 시나리오에서 정보 신선도를 나타내는 AoI(Age of Information) 개념을 도입하여 차량 간 통신 스케줄링 문제를 다루었습니다.' },
    { id: 'S1B4P2', image: 'imgs/Posters/S1B4P2.webp', title: 'RIS 보조 ISAC 시스템의 레이더 SINR 최적화', description: '본 연구에서는 능동 RIS(Reconfigurable Intelligent Surface)를 활용한 통합 감지·통신(ISAC) 시스템에서 레이더의 SINR을 최대화하기 위해 이동형 안테나 최적화 알고리즘을 개발하였습니다.' },
    { id: 'S1B4P3', image: 'imgs/Posters/S1B4P3.webp', title: '스마트그리드 ICS 네트워크 토폴로지 구성도', description: '본 연구에서는 스마트그리드 환경을 구성하는 ICS 전체 네트워크 토폴로지를 설계하였습니다.' },
    { id: 'S1B4P4', image: 'imgs/Posters/S1B4P4.webp', title: '방사선 환경 반도체 소자의 TID·SEU 영향 분석', description: '본 연구에서는 우주 방사선 환경에 노출된 반도체 소자에 미치는 TID와 SEU 영향을 종합적으로 분석하였습니다.' },
    { id: 'S1B4P5', image: 'imgs/Posters/S1B4P5.webp', title: '뇌종양 MRI 치료 전후 AR 시각화 비교', description: '본 연구에서는 혼합현실(AR) 환경에서 뇌종양 환자의 치료 전후 MRI 영상을 3D로 중첩 시각화하는 시스템을 개발하였습니다.' },
  ],
  S1B5: [
    { id: 'S1B5P1', image: 'imgs/Posters/S1B5P1.webp', title: 'AI 에이전트 기반 제조 설비 제어', description: '본 연구에서는 AI 에이전트를 활용하여 AFPM 모터 생산 라인의 PLC 주소를 실시간으로 모니터링하고 생산 공정을 자동 제어하는 스마트 제조 시스템을 개발하였습니다.' },
    { id: 'S1B5P2', image: 'imgs/Posters/S1B5P2.webp', title: '제조 밸류체인 ESG 플랫폼 개발', description: '본 연구는 경남지능화혁신사업단의 우수과제로 선정된 연구로, 제조 밸류체인 전반에 걸친 ESG 규제 대응을 위한 데이터 분석·구조화·프로세스 최적화 플랫폼을 개발하였습니다.' },
    { id: 'S1B5P3', image: 'imgs/Posters/S1B5P3.webp', title: 'LLM 기반 PDF 자동 비식별화 시스템', description: '본 연구에서는 대형 언어 모델(LLM)을 활용하여 PDF 문서 내의 개인정보를 자동으로 탐지하고 비식별화하는 7단계 파이프라인 시스템을 개발하였습니다.' },
    { id: 'S1B5P4', image: 'imgs/Posters/S1B5P4.webp', title: '무한궤도 차량 3D 포인트클라우드 시각화', description: '본 연구에서는 무한궤도 차량의 3D 형상을 포인트클라우드 방식으로 스캔하여 시각화 데이터를 구축하였습니다.' },
    { id: 'S1B5P5', image: 'imgs/Posters/S1B5P5.webp', title: '무한궤도 차량 3D 포인트클라우드 시각화 (2)', description: '본 연구에서는 무한궤도 차량을 대상으로 다각도 3D 포인트클라우드 데이터를 시각화하여 고품질 3D 데이터셋을 제공하고 있습니다.' },
  ],
  S1B6: [
    { id: 'S1B6P1', image: 'imgs/Posters/S1B6P1.webp', title: 'G5-AICT 연구센터 공동기술개발 전시', description: 'G5-AICT 연구센터와 공동 개발한 4개 혁신 기술을 소개합니다. ECHO CARE, GHOSTPASS, 마이오루메, 모노스케일을 통해 AI·ICT 기술의 실생활 응용 가능성을 제시합니다.' },
    { id: 'S1B6P2', image: 'imgs/Posters/S1B6P2.webp', title: '모빌리티·에너지 AI+ICT 기술 소개', description: 'AI+ICT 융합 기술을 모빌리티와 에너지 분야에 적용한 성과를 소개합니다.' },
    { id: 'S1B6P3', image: 'imgs/Posters/S1B6P3.webp', title: '헬스케어 AI+ICT 연구 성과', description: 'AI+ICT 기술을 헬스케어 분야에 적용한 3세부 연구 성과를 발표합니다.' },
    { id: 'S1B6P4', image: 'imgs/Posters/S1B6P4.webp', title: '의료 AI+ICT 연구 성과', description: '의료 분야 AI+ICT 융합 연구 성과를 소개합니다.' },
    { id: 'S1B6P5', image: 'imgs/Posters/S1B6P5.webp', title: '문화콘텐츠·생산제조 AI+ICT 소개', description: '문화콘텐츠와 생산제조 분야의 AI+ICT 융합 연구 성과를 발표합니다.' },
  ],
  S1B7: [
    { id: 'S1B7P1', image: 'imgs/Posters/S1B7P1.webp', title: '충북대학교 산업인공지능연구센터 소개', description: '충북대학교 산업인공지능연구센터(IRIS)는 산업 현장의 지능화 혁신을 이끄는 연구 기관으로 운영되고 있습니다.' },
    { id: 'S1B7P2', image: 'imgs/Posters/S1B7P2.webp', title: 'Massive IoT 그래프 데이터 처리 기술', description: '대규모 IoT 환경에서 생성되는 방대한 그래프 데이터를 효율적으로 저장·실시간 처리·분석하는 기술을 연구합니다.' },
    { id: 'S1B7P3', image: 'imgs/Posters/S1B7P3.webp', title: '안테나 BFN 및 지능형 빔형성 기술 개발', description: 'Massive LPWAN 기반의 지능형 네트워크 기술을 연구합니다. LoRa 통신 프로토콜을 활용한 게이트웨이를 직접 설계하고 스마트팩토리 공정 모니터링 시스템에 적용합니다.' },
    { id: 'S1B7P4', image: 'imgs/Posters/S1B7P4.webp', title: '물류배송 스마트 모빌리티 환경인지 기술', description: '물류배송 자율주행 차량의 안전 운행을 위한 환경인지 기술을 개발하였습니다.' },
    { id: 'S1B7P5', image: 'imgs/Posters/S1B7P5.webp', title: '자율주행 긴급상황 안전제어(MRM) 개발', description: '자율주행 중 발생하는 이상 상황에 신속하게 대응하기 위한 최소위험조작(MRM) 시스템을 개발하였습니다.' },
  ],
};
