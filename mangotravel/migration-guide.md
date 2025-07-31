# MangoTravel GitHub Import 가이드

## 1. GitHub에서 Import한 후 설정 단계

### 환경 변수 설정
.env 파일에 다음 내용 추가:
```
GOOGLE_MAPS_API_KEY=AIzaSyCtWpFBiQXU78Y66djkoTJXChEhFix5D0Q
DATABASE_URL=(Replit에서 제공하는 PostgreSQL URL)
OPENWEATHER_API_KEY=(필요시 추가)
```

### 패키지 설치 및 데이터베이스 설정
```bash
npm install
npm run db:push
npm run dev
```

## 2. AI Assistant 모드 활성화
- 프로젝트 설정에서 AI 모델을 비용 효율적인 모델로 변경
- Claude 3.5 Haiku 또는 GPT-3.5 Turbo 추천

## 3. 기존 기능 확인
✅ 여행 계획 CRUD
✅ 일정 관리 
✅ Google Maps 연동
✅ 날씨 정보
✅ 필수준비물 체크리스트
✅ 참가자 관리 (나이 필드 제거됨)
✅ 장소명 표시 (주소 대신)

## 4. 완료된 개선사항
- 폼 데이터 자동 로딩
- 참가자 정보 객체 처리 수정
- 장소명 지능형 추출
- React 렌더링 오류 해결

## 5. 문제 해결
문제 발생시 다음 명령어 실행:
```bash
rm -rf node_modules
npm install
npm run db:push
```

이제 동일한 기능을 가진 앱을 Assistant 모드에서 저렴하게 사용할 수 있습니다!