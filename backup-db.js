
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

const execAsync = promisify(exec);

async function backupDatabase() {
  try {
    console.log('데이터베이스 백업 시작...');
    
    // 환경변수에서 DATABASE_URL 확인
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('DATABASE_URL이 설정되지 않았습니다.');
      console.log('다음 명령으로 환경변수를 먼저 로드하세요:');
      console.log('export $(grep -v "^#" .env | xargs)');
      return;
    }
    
    console.log('데이터베이스 연결 확인 중...');
    
    const backupFile = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.sql`;
    
    // pg_dump를 사용하여 데이터베이스 백업 (더 안전한 방식)
    const command = `pg_dump "${databaseUrl}" --no-owner --no-privileges --clean --if-exists`;
    
    console.log('백업 실행 중...');
    const { stdout, stderr } = await execAsync(command);
    
    // 백업 파일에 쓰기
    const fs = await import('fs');
    fs.writeFileSync(backupFile, stdout);
    
    if (stderr) {
      console.warn('경고:', stderr);
    }
    
    console.log(`✅ 백업 완료: ${backupFile}`);
    console.log('\n외부 서버에서 복원 방법:');
    console.log(`1. 파일 복사: scp ${backupFile} user@server:/path/to/project/`);
    console.log(`2. 복원 실행: psql "외부서버_DATABASE_URL" < ${backupFile}`);
    
    // 파일 크기 확인
    const stats = fs.statSync(backupFile);
    console.log(`백업 파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('백업 실패:', error.message);
    
    if (error.message.includes('pg_dump')) {
      console.log('\n해결 방법:');
      console.log('1. PostgreSQL 클라이언트 도구 설치 확인');
      console.log('2. DATABASE_URL 형식 확인');
      console.log('3. 데이터베이스 연결 권한 확인');
    }
  }
}

backupDatabase();
