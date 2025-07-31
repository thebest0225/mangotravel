# MangoTravel Assistant 프로젝트 설정 가이드

## 1. 폴더 구조 생성
새 프로젝트에서 다음 폴더들을 생성하세요:

```
프로젝트 루트/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── layout/
│   │   │   ├── travel/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── assets/
│   ├── public/
│   └── index.html
├── server/
├── shared/
└── attached_assets/
```

## 2. 패키지 설치
```bash
npm install
```

## 3. 환경 변수 설정
.env 파일에 다음 내용 추가:
```
GOOGLE_MAPS_API_KEY=AIzaSyCtWpFBiQXU78Y66djkoTJXChEhFix5D0Q
OPENWEATHER_API_KEY=your-openweather-key
DATABASE_URL=your-database-url
```

## 4. 데이터베이스 설정
```bash
npm run db:push
```

## 5. 개발 서버 시작
```bash
npm run dev
```

## 주요 기능
- ✅ 여행 계획 생성/수정/삭제
- ✅ 일정 관리 (시간별 스케줄)
- ✅ Google Maps 연동 (경로, 장소 검색)
- ✅ 날씨 정보 표시
- ✅ 필수준비물 체크리스트
- ✅ 참가자 관리
- ✅ 항공편 정보 관리
- ✅ 장소 저장 및 카테고리 관리

## 이전 완료된 개선사항
- ✅ 참가자에서 나이 필드 제거
- ✅ 계획 수정 폼 데이터 자동 로딩
- ✅ 일정 카드에서 장소명 표시 (주소 대신)
- ✅ 폼 리셋 기능으로 데이터 안정성 향상