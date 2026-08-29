# 🥔 감자마켓 (Gamza Market)

> **포슬포슬 따뜻한 이웃 간의 중고거래 플랫폼, 감자마켓**  
> 강원도 춘천시 감자동을 배경으로 이웃과 따뜻한 정을 나누는 중고거래 웹 애플리케이션입니다.

---

## ✨ 주요 기능 (Key Features)

- **🥔 감자 테마 UI/UX & 반응형 디자인**
  - 감자/포슬/노랑/브라운 계열의 따뜻하고 직관적인 디자인
  - 모바일 및 데스크톱 환경 모두에 최적화된 반응형 레이아웃
- **🔐 회원가입 & 로그인 (Supabase Auth)**
  - 이메일/비밀번호 기반 계정 생성 및 로그인
  - 로그인 시 실시간 헤더 및 프로필 상태 동기화
- **📦 중고 물품 등록 및 거래**
  - 상품 사진 다중/단일 업로드 (Supabase Storage)
  - 카테고리 선택, 가격 설정 (무료 나눔 지원), 위치 지정
  - 상품 상세 정보 모달 및 작성자 정보 연동
- **👤 프로필 & 매너온도 관리**
  - 프로필 사진 변경 및 닉네임 수정
  - 기본 실루엣 아바타 및 매너온도 (36.5℃) 표시
- **🔍 검색 및 카테고리 필터링**
  - 키워드 기반 실시간 상품 검색
  - 전체 / 농수산물 / 가전·디지털 / 가구·인테리어 등 다양한 카테고리별 필터

---

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend / BaaS**: [Supabase](https://supabase.com)
  - **Database**: PostgreSQL (`products`, `profiles`, `categories`)
  - **Auth**: Supabase Auth
  - **Storage**: Supabase Storage (`product-images` bucket)
- **Icons & Fonts**: FontAwesome, Pretendard

---

## 📁 프로젝트 구조 (Project Structure)

```
gamza-market/
├── index.html              # 메인 HTML 구조
├── README.md               # 프로젝트 소개 문서
├── .gitignore              # Git 무시 파일 목록
├── css/
│   └── style.css           # 감자 테마 및 컴포넌트 스타일시트
├── js/
│   ├── app.js              # 메인 애플리케이션 진입점 및 초기화
│   ├── supabaseClient.js   # Supabase 클라이언트, Auth, Storage 연동 모듈
│   ├── productList.js      # 상품 목록 렌더링, 정렬 및 카테고리 필터링
│   ├── detailModal.js      # 상품 상세 보기 모달
│   ├── createModal.js      # 상품 등록 모달 및 이미지 업로드
│   ├── authModal.js        # 로그인 / 회원가입 모달
│   ├── profileModal.js     # 내 프로필 조회 및 수정 모달
│   └── mockData.js         # 오프라인/초기 폴백용 데이터
└── assets/
    └── default-avatar.svg  # 기본 실루엣 아바타 이미지
```

---

## 🚀 실행 방법 (Getting Started)

1. 저장소를 클론합니다:
   ```bash
   git clone https://github.com/TeeDDub/gamza-market.git
   cd gamza-market
   ```

2. 로컬 웹 서버(Live Server, `python -m http.server`, `npx serve` 등)를 통해 `index.html`을 실행합니다:
   ```bash
   # 예시: Python 간단 서버 실행
   python3 -m http.server 8000
   ```

3. 브라우저에서 `http://localhost:8000`으로 접속하여 감자마켓을 이용합니다.

---

## 📄 라이선스 (License)

MIT License
