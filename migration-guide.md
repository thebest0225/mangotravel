
# MangoTravel 외부 서버 배포 가이드

## 1. 사전 준비 (Replit에서)

### 데이터베이스 백업
```bash
# 환경변수 로드
export $(grep -v '^#' .env.production | xargs)

# 데이터베이스 백업 실행
node backup-db.js
```

### 필요한 파일들 확인
- `.env.production` (환경변수)
- `backup_YYYY-MM-DD.sql` (데이터베이스 백업)
- 전체 프로젝트 소스코드

## 2. 외부 서버 설정

### PostgreSQL 설치 및 설정
```bash
# PostgreSQL 설치 (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL 서비스 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 데이터베이스 및 사용자 생성
sudo -u postgres createuser travel
sudo -u postgres createdb mango_travel_db
sudo -u postgres psql -c "ALTER USER travel WITH ENCRYPTED PASSWORD 'Aapass123!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mango_travel_db TO travel;"
```

### Node.js 설치
```bash
# Node.js 18+ 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 3. 프로젝트 배포

### 파일 복사 및 권한 설정
```bash
# 프로젝트 디렉토리 생성
mkdir /var/www/mangotravel
cd /var/www/mangotravel

# 소스코드 복사 (scp, rsync 등 사용)
# .env.production 파일도 함께 복사

# 권한 설정
sudo chown -R $USER:$USER /var/www/mangotravel
chmod +x start-external.sh
```

### 의존성 설치 및 빌드
```bash
npm install
```

### 데이터베이스 복원
```bash
# 환경변수 로드
export $(grep -v '^#' .env.production | xargs)

# 스키마 적용
npm run db:push

# 데이터 복원 (백업 파일 이름에 맞게 수정)
psql "$DATABASE_URL" < backup_2024-01-15T10-30-00.sql
```

### 애플리케이션 빌드 및 실행
```bash
# 빌드
npm run build

# 실행
npm start

# 또는 스크립트 사용
./start-external.sh
```

## 4. 환경 변수 설정

외부 서버의 `.env.production` 파일에서 다음 값들을 외부 서버 환경에 맞게 수정:

```env
PORT=8888
NODE_ENV=production
DATABASE_URL=postgresql://travel:Aapass123!@localhost:5432/mango_travel_db
GOOGLE_MAPS_API_KEY=AIzaSyCtWpFBiQXU78Y66djkoTJXChEhFix5D0Q
OPENWEATHER_API_KEY=15af7a8c5b589523ffa19a13872b5572
SESSION_SECRET=your_secure_session_secret_key_here
```

## 5. 방화벽 설정

```bash
# 8888 포트 열기
sudo ufw allow 8888
sudo ufw enable
```

## 6. 프로세스 관리 (PM2 권장)

```bash
# PM2 설치
npm install -g pm2

# 애플리케이션 실행
pm2 start npm --name "mangotravel" -- start

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

## 7. 접속 확인

브라우저에서 `http://외부서버IP:8888`로 접속하여 애플리케이션이 정상 작동하는지 확인합니다.
