import 'dotenv/config';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, {max:1});
const rows = await sql`select id, tag, applied_at from drizzle.__drizzle_migrations order by applied_at`;
console.log(JSON.stringify(rows,null,2));
await sql.end();
