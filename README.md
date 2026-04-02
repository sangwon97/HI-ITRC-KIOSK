# HI-ITRC-KIOSK

키오스크 UI는 작은 기능 단위보다 "큰 화면 영역" 기준으로 보는 편이 유지보수에 더 잘 맞아서, 디렉토리도 그 기준으로 정리했습니다.

## 구조 원칙

- 공통 데이터와 유틸은 `src/data`, `src/utils`, `src/assets`에 둡니다.
- 화면 코드는 `src/screens` 아래에서 큰 서비스 영역별로 묶습니다.
- `부스 안내`처럼 같은 흐름에 속한 하위 화면은 한 폴더 안에 모읍니다.
- CSS는 각 화면 폴더 안의 `styles.css`로 같이 두어, JSX와 스타일을 한 자리에서 찾을 수 있게 합니다.
- 아이콘과 이미지 에셋은 `src/assets/icons`로 모아 import 경로를 일관되게 유지합니다.

## 디렉토리 구조

```text
src
├── assets
│   └── icons
├── data
├── screens
│   ├── booth-guide
│   │   ├── BoothBrowser
│   │   ├── BoothDetail
│   │   ├── CenterInfo
│   │   └── PosterDetail
│   ├── booth-search
│   │   └── SearchScreen
│   ├── event-info
│   │   └── InfoScreen
│   ├── exhibition-map
│   │   ├── Map3DScreen
│   │   └── MapView
│   ├── home
│   │   └── HomeScreen
│   └── idle
│       └── IdleScreen
├── styles
├── three
└── utils
```

## 폴더별 역할

- `src/screens/exhibition-map`
  키오스크의 메인 프레임 역할을 하는 화면입니다. 좌측 사이드 메뉴와 우측 콘텐츠 영역, 3D 지도 관련 화면이 여기에 들어갑니다.

- `src/screens/booth-guide`
  `부스 안내 > 카테고리 선택 > 연구센터 > 포스터`까지 이어지는 한 흐름을 묶어 둔 영역입니다.

- `src/screens/booth-search`
  터치 키보드와 검색 결과 화면을 담당합니다.

- `src/screens/event-info`
  행사 개요, 프로그램, 전시 구역 같은 안내성 콘텐츠를 담당합니다.

- `src/screens/idle`
  사용자가 손대지 않을 때 보이는 대기 화면입니다.
