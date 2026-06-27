import 'dotenv/config';
import postgres from 'postgres';
const url = process.env.DATABASE_URL;
if(!url){ console.error('No DATABASE_URL'); process.exit(1); }
const sql = postgres(url,{max:1});
try{
  const rows = await sql`select * from drizzle.__drizzle_migrations order by id`;
  console.log(JSON.stringify(rows,null,2));
}catch(e){ console.error(e.message);
  const rows = await sql`select * from __drizzle_migrations order by id`;
  console.log(JSON.stringify(rows,null,2));
}
await sql.end();
