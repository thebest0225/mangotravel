
const fs = require('fs');

// PostgreSQL 덤프를 MySQL 형식으로 변환
const convertPgToMysql = (inputFile, outputFile) => {
  let sql = fs.readFileSync(inputFile, 'utf8');
  
  // PostgreSQL 특정 구문 제거/변환
  sql = sql.replace(/--.*$/gm, ''); // 주석 제거
  sql = sql.replace(/SET.*;$/gm, ''); // SET 명령 제거
  sql = sql.replace(/SELECT pg_catalog\..*;$/gm, ''); // pg_catalog 제거
  sql = sql.replace(/CREATE SCHEMA.*;$/gm, ''); // 스키마 생성 제거
  sql = sql.replace(/ALTER TABLE.*OWNER TO.*;$/gm, ''); // OWNER 변경 제거
  
  // 데이터 타입 변환
  sql = sql.replace(/SERIAL/gi, 'INT AUTO_INCREMENT');
  sql = sql.replace(/BIGSERIAL/gi, 'BIGINT AUTO_INCREMENT');
  sql = sql.replace(/TEXT/gi, 'TEXT');
  sql = sql.replace(/JSONB/gi, 'JSON');
  sql = sql.replace(/TIMESTAMP/gi, 'DATETIME');
  sql = sql.replace(/now\(\)/gi, 'NOW()');
  
  // Boolean 타입 처리
  sql = sql.replace(/BOOLEAN/gi, 'TINYINT(1)');
  sql = sql.replace(/'t'/g, '1');
  sql = sql.replace(/'f'/g, '0');
  
  // PRIMARY KEY 구문 정리
  sql = sql.replace(/PRIMARY KEY,/g, 'PRIMARY KEY,');
  
  fs.writeFileSync(outputFile, sql, 'utf8');
  console.log(`변환 완료: ${outputFile}`);
};

// 사용법
if (process.argv.length > 2) {
  const inputFile = process.argv[2] || 'backup.sql';
  const outputFile = process.argv[3] || 'mysql_backup.sql';
  convertPgToMysql(inputFile, outputFile);
} else {
  console.log('사용법: node convert_pg_to_mysql.js input.sql output.sql');
}
