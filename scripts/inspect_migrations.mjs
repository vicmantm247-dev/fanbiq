import 'dotenv/config';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, {max:1});
const rows = await sql`select * from drizzle.__drizzle_migrations limit 10`;
console.log(JSON.stringify(rows,null,2));
await sql.end();
