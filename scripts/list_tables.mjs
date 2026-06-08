import 'dotenv/config';
import postgres from 'postgres';
const url = process.env.DATABASE_URL;
if(!url){ console.error('No DATABASE_URL'); process.exit(1); }
const sql = postgres(url,{max:1});
const rows = await sql`select schemaname, tablename from pg_tables where schemaname in ('public','drizzle') order by schemaname, tablename`;
console.log(JSON.stringify(rows,null,2));
await sql.end();
