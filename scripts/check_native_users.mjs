import 'dotenv/config';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const rows = await sql.unsafe('select * from "NativeUser" limit 20');
console.log(JSON.stringify(rows, null, 2));
await sql.end();
