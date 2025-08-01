
import { db, connection } from './server/db.js';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function backupDatabase() {
  try {
    console.log('데이터베이스 백업 시작...');
    
    // PostgreSQL dump 명령어 실행
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL이 설정되지 않았습니다.');
    }
    
    const backupFile = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.sql`;
    
    // pg_dump를 사용하여 데이터베이스 백업
    const command = `pg_dump "${databaseUrl}" > ${backupFile}`;
    
    await execAsync(command);
    
    console.log(`백업 완료: ${backupFile}`);
    console.log('외부 서버에서 다음 명령으로 복원하세요:');
    console.log(`psql "${process.env.DATABASE_URL}" < ${backupFile}`);
    
  } catch (error) {
    console.error('백업 실패:', error);
  } finally {
    await connection.end();
  }
}

backupDatabase();
