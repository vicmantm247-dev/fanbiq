import 'dotenv/config';
import fs from 'fs';
import postgres from 'postgres';
const path = './src/db/migrations/0000_initial_postgres.sql';
const sqlText = fs.readFileSync(path, 'utf8');
const parts = sqlText.split('--> statement-breakpoint');
const sql = postgres(process.env.DATABASE_URL, {max:1});
for (const p of parts) {
  const stmt = p.trim();
  if (!stmt) continue;
  console.log('EXECUTING STATEMENT START ---');
  console.log(stmt.slice(0,200) + (stmt.length>200? '...':'') );
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(stmt);
    });
    console.log('OK');
  } catch (e) {
    console.error('FAILED:', e.message || e);
  }
}
await sql.end();
console.log('Done');
