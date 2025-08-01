
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
require('dotenv').config();

const execAsync = promisify(exec);

async function backupDatabase() {
  try {
    console.log('데이터베이스 백업 시작...');
    
    // 환경변수에서 DATABASE_URL 확인
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('DATABASE_URL이 설정되지 않았습니다.');
      console.log('현재 환경변수:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
      return;
    }
    
    console.log('DATABASE_URL 확인됨 (일부):', databaseUrl.substring(0, 20) + '...');
    
    const backupFile = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.sql`;
    
    // pg_dump 명령어 실행 (더 안전한 방식)
    const command = `pg_dump "${databaseUrl}" --no-owner --no-privileges --clean --if-exists`;
    
    console.log('백업 실행 중...');
    const { stdout, stderr } = await execAsync(command);
    
    // 백업 내용이 있는지 확인
    if (!stdout || stdout.trim().length === 0) {
      throw new Error('백업 데이터가 비어있습니다.');
    }
    
    // 백업 파일에 쓰기
    fs.writeFileSync(backupFile, stdout);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.warn('경고:', stderr);
    }
    
    // 파일 크기 확인
    const stats = fs.statSync(backupFile);
    console.log(`✅ 백업 완료: ${backupFile}`);
    console.log(`백업 파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // 백업 내용 미리보기 (처음 몇 줄)
    const preview = stdout.split('\n').slice(0, 5).join('\n');
    console.log('\n백업 내용 미리보기:');
    console.log(preview);
    
    console.log('\n외부 서버에서 복원 방법:');
    console.log(`1. 파일 복사: scp ${backupFile} user@server:/path/to/project/`);
    console.log(`2. 복원 실행: psql "외부서버_DATABASE_URL" < ${backupFile}`);
    
  } catch (error) {
    console.error('백업 실패:', error.message);
    
    if (error.message.includes('pg_dump')) {
      console.log('\n해결 방법:');
      console.log('1. PostgreSQL 클라이언트 도구가 설치되어 있는지 확인');
      console.log('2. DATABASE_URL 형식이 올바른지 확인');
      console.log('3. 데이터베이스 연결 권한 확인');
      
      // pg_dump 설치 여부 확인
      try {
        await execAsync('which pg_dump');
        console.log('✅ pg_dump가 설치되어 있습니다.');
      } catch {
        console.log('❌ pg_dump가 설치되지 않았습니다.');
        console.log('설치 명령: apt-get install postgresql-client');
      }
    }
    
    // DATABASE_URL 형식 검증
    if (process.env.DATABASE_URL) {
      const url = process.env.DATABASE_URL;
      if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
        console.log('❌ DATABASE_URL 형식이 잘못되었습니다. postgresql:// 또는 postgres://로 시작해야 합니다.');
      }
    }
  }
}

backupDatabase();
