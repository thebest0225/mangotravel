
const { Pool } = require('pg');
const mysql = require('mysql2/promise');

async function migrateData() {
  // PostgreSQL 연결
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL_OLD // 기존 PostgreSQL URL
  });
  
  // MySQL 연결
  const mysqlConn = await mysql.createConnection({
    uri: process.env.DATABASE_URL // 새 MySQL URL
  });
  
  try {
    // 각 테이블별로 데이터 이동
    const tables = ['users', 'travel_plans', 'schedule_items', 'saved_places', 'location_labels'];
    
    for (const table of tables) {
      console.log(`${table} 테이블 이동 중...`);
      
      // PostgreSQL에서 데이터 조회
      const result = await pgPool.query(`SELECT * FROM ${table}`);
      const rows = result.rows;
      
      if (rows.length > 0) {
        // MySQL에 데이터 삽입
        const columns = Object.keys(rows[0]).join(', ');
        const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
        
        for (const row of rows) {
          const values = Object.values(row);
          await mysqlConn.execute(
            `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
            values
          );
        }
      }
      
      console.log(`${table}: ${rows.length}개 레코드 이동 완료`);
    }
    
  } catch (error) {
    console.error('데이터 이동 중 오류:', error);
  } finally {
    await pgPool.end();
    await mysqlConn.end();
  }
}

migrateData();
